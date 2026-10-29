package com.geeks.riis_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geeks.riis_backend.dto.ReportResultDTO;
import com.geeks.riis_backend.dto.ReportPreviewRowDTO;
import com.geeks.riis_backend.dto.ReportStatsDTO;
import com.geeks.riis_backend.model.ReportJob;
import com.geeks.riis_backend.model.ResearchOutput;
import com.geeks.riis_backend.repository.ReportJobRepository;
import com.geeks.riis_backend.repository.ResearchOutputRepository;
import com.geeks.riis_backend.repository.UserRepository;
import com.itextpdf.text.*;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import com.geeks.riis_backend.dto.ReportRequestDTO;
import com.itextpdf.text.Rectangle;

import java.io.ByteArrayOutputStream;
import java.io.StringWriter;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ResearchOutputRepository researchOutputRepository;
    private final ReportJobRepository reportJobRepository;
    private final UserRepository userRepository;
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;
    private final ReportExportService reportExportService;


    @Value("${app.s3.bucket}")
    private String BUCKET;

    @Transactional
    public ReportResultDTO generateSynchronous(ReportRequestDTO request, String actorId) {
        List<ResearchOutput> data = buildFilteredDataset(request);
        byte[] bytes;
        String contentType;
        String extension;

        try {
            if ("PDF".equalsIgnoreCase(request.outputFormat())) {
                bytes = exportPDF(data, request);
                contentType = "application/pdf";
                extension = "pdf";
            } else {
                bytes = exportCSV(data);
                contentType = "text/csv";
                extension = "csv";
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate report: " + e.getMessage(), e);
        }

        String key = "reports/" + UUID.randomUUID() + "." + extension;
        uploadToS3(bytes, key, contentType);
        String url = generatePresignedUrl(key);

        ReportJob job = ReportJob.builder()
                .status("COMPLETE")
                .s3Key(key)
                .downloadUrl(url)
                .outputFormat(request.outputFormat())
                .recordCount(data.size())
                .completedAt(Instant.now())
                .build();
        reportJobRepository.save(job);

        return new ReportResultDTO(job.getId(), "COMPLETE", url,
                "report-" + System.currentTimeMillis() + "." + extension,
                data.size(), job.getCompletedAt());
    }

    @Transactional(readOnly = true)
    public List<ReportPreviewRowDTO> previewFilteredDataset(ReportRequestDTO request) {
        return buildFilteredDataset(request).stream()
                .limit(5)
                .map(o -> new ReportPreviewRowDTO(
                        o.getId(),
                        o.getReferenceNumber(),
                        o.getTitle(),
                        o.getResearchType(),
                        o.getFundingSource(),
                        o.getCompletionYear(),
                        o.getCreatedAt(),
                        o.getCreatedAt(),
                        o.getStatus(),
                        o.getInstitution() != null ? o.getInstitution().getId() : null,
                        o.getInstitution() != null ? o.getInstitution().getName() : null,
                        joinAuthors(o, ", "),
                        o.getSubjectDc()
                ))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ReportStatsDTO buildStats(ReportRequestDTO request) {
        return computeStats(buildFilteredDataset(request));
    }

    private ReportStatsDTO computeStats(List<ResearchOutput> data) {
        Set<String> authors = new HashSet<>();
        Set<String> institutions = new HashSet<>();
        Map<String, Long> byType = new TreeMap<>();
        Map<String, Long> byYear = new TreeMap<>();
        Map<String, Long> byFunding = new TreeMap<>();
        Map<String, Long> byInstitution = new TreeMap<>();

        for (ResearchOutput o : data) {
            byType.merge(labelOrUnspecified(o.getResearchType()), 1L, Long::sum);
            byYear.merge(o.getCompletionYear() != null
                    ? String.valueOf(o.getCompletionYear()) : "Unspecified", 1L, Long::sum);
            byFunding.merge(labelOrUnspecified(o.getFundingSource()), 1L, Long::sum);
            byInstitution.merge(labelOrUnspecified(
                    o.getInstitution() != null ? o.getInstitution().getName() : null), 1L, Long::sum);

            if (o.getInstitution() != null && o.getInstitution().getId() != null) {
                institutions.add(o.getInstitution().getId());
            }
            if (o.getAuthors() != null) {
                o.getAuthors().forEach(a -> {
                    if (a.getFullName() != null && !a.getFullName().isBlank()) {
                        authors.add(a.getFullName().trim().toLowerCase());
                    }
                });
            }
        }

        return new ReportStatsDTO(data.size(), authors.size(), institutions.size(),
                byType, byYear, byFunding, byInstitution);
    }

    private String labelOrUnspecified(String value) {
        return value == null || value.isBlank() ? "Unspecified" : value.trim();
    }

    private String joinAuthors(ResearchOutput o, String separator) {
        return o.getAuthors() == null ? "" :
                o.getAuthors().stream()
                        .map(com.geeks.riis_backend.model.Author::getFullName)
                        .filter(name -> name != null && !name.isBlank())
                        .collect(Collectors.joining(separator));
    }

    /** Prints the filters the user selected, so the report documents how it was generated. */
    private void addConfigSection(Document doc, ReportRequestDTO request,
                                  List<ResearchOutput> data, Font sectionFont) throws Exception {
        Font labelFont = new Font(Font.FontFamily.HELVETICA, 8, Font.BOLD, BaseColor.DARK_GRAY);
        Font valueFont = new Font(Font.FontFamily.HELVETICA, 9);

        doc.add(Chunk.NEWLINE);
        doc.add(new Paragraph("Report Configuration", sectionFont));

        String yearFrom = request.yearFrom() != null ? String.valueOf(request.yearFrom()) : "—";
        String yearTo = request.yearTo() != null ? String.valueOf(request.yearTo()) : "—";

        String[][] rows = {
                {"Scope", describeScope(request, data)},
                {"Year Range", yearFrom + " – " + yearTo},
                {"Research Type", joinOrAll(request.researchTypes())},
                {"Funding Source", joinOrAll(request.fundingSources())},
        };

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(60);
        table.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.setSpacingBefore(6f);
        table.setWidths(new float[]{1.4f, 4f});
        table.setKeepTogether(true);

        for (String[] row : rows) {
            PdfPCell labelCell = new PdfPCell(new Phrase(row[0], labelFont));
            labelCell.setBorder(Rectangle.NO_BORDER);
            labelCell.setPaddingBottom(4);
            table.addCell(labelCell);

            PdfPCell valueCell = new PdfPCell(new Phrase(row[1], valueFont));
            valueCell.setBorder(Rectangle.NO_BORDER);
            valueCell.setPaddingBottom(4);
            table.addCell(valueCell);
        }
        doc.add(table);
    }

    private String describeScope(ReportRequestDTO request, List<ResearchOutput> data) {
        boolean hasInstitution = request.institutionId() != null && !request.institutionId().isBlank();
        boolean hasProvince = request.province() != null && !request.province().isBlank();

        if (hasInstitution) {
            String name = data.stream()
                    .map(o -> o.getInstitution())
                    .filter(i -> i != null && request.institutionId().equals(i.getId()) && i.getName() != null)
                    .map(i -> i.getName())
                    .findFirst()
                    .orElse("Selected institution");
            return "By HEI — " + name;
        }
        if (hasProvince) {
            return "By Province — " + request.province();
        }
        return "All Region VII";
    }

    private String joinOrAll(List<String> values) {
        if (values == null || values.isEmpty()) return "All";
        return String.join(", ", values);
    }

    /** Overview as a small vertical table: Metric | Count (total records, authors, institutions). */
    private void addOverviewTable(Document doc, ReportStatsDTO stats,
                                  Font headerFont, Font cellFont) throws Exception {
        Font titleFont = new Font(Font.FontFamily.HELVETICA, 10, Font.BOLD);
        BaseColor navy = new BaseColor(26, 26, 46);
        BaseColor line = new BaseColor(226, 232, 240);
        BaseColor zebra = new BaseColor(248, 250, 252);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{7f, 1.6f});
        table.setKeepTogether(true);
        table.setSpacingAfter(14f);

        PdfPCell title = new PdfPCell(new Phrase("Overview", titleFont));
        title.setColspan(2);
        title.setBorder(Rectangle.NO_BORDER);
        title.setPaddingLeft(0f);
        title.setPaddingBottom(4f);
        table.addCell(title);

        table.addCell(styledCell("Metric", headerFont, Element.ALIGN_LEFT, navy, navy));
        table.addCell(styledCell("Count", headerFont, Element.ALIGN_RIGHT, navy, navy));

        String[][] rows = {
                {"Total Records", String.valueOf(stats.totalRecords())},
                {"Authors", String.valueOf(stats.uniqueAuthors())},
                {"Institutions", String.valueOf(stats.uniqueInstitutions())},
        };
        for (int i = 0; i < rows.length; i++) {
            BaseColor bg = (i % 2 == 1) ? zebra : BaseColor.WHITE;
            table.addCell(styledCell(rows[i][0], cellFont, Element.ALIGN_LEFT, bg, line));
            table.addCell(styledCell(rows[i][1], cellFont, Element.ALIGN_RIGHT, bg, line));
        }
        doc.add(table);
    }

    /** The four breakdown tables stacked vertically, each kept whole on a page. */
    private void addAnalyticsStack(Document doc, ReportStatsDTO stats, Font headerFont,
                                   Font cellFont, Font boldCellFont) throws Exception {
        PdfPTable[] tables = {
                buildBreakdownTable("Records by Research Type", "Research Type",
                        limitRows(stats.byResearchType(), 8), headerFont, cellFont, boldCellFont),
                buildBreakdownTable("Records by Completion Year", "Year",
                        limitRows(stats.byYear(), 8), headerFont, cellFont, boldCellFont),
                buildBreakdownTable("Records by Funding Source", "Funding Source",
                        limitRows(stats.byFundingSource(), 8), headerFont, cellFont, boldCellFont),
                buildBreakdownTable("Records by Institution", "Institution",
                        limitRows(stats.byInstitution(), 8), headerFont, cellFont, boldCellFont),
        };

        for (PdfPTable t : tables) {
            t.setKeepTogether(true);   // a table never splits across two pages
            t.setSpacingAfter(14f);
            doc.add(t);
        }
    }

    /** Keeps the biggest rows and folds the rest into one "Others" row (totals stay correct). */
    private Map<String, Long> limitRows(Map<String, Long> counts, int maxRows) {
        if (counts.size() <= maxRows) return counts;

        List<Map.Entry<String, Long>> sorted = new java.util.ArrayList<>(counts.entrySet());
        sorted.sort((x, y) -> Long.compare(y.getValue(), x.getValue()));

        Map<String, Long> limited = new java.util.LinkedHashMap<>();
        long others = 0;
        int hidden = 0;
        for (int i = 0; i < sorted.size(); i++) {
            if (i < maxRows - 1) {
                limited.put(sorted.get(i).getKey(), sorted.get(i).getValue());
            } else {
                others += sorted.get(i).getValue();
                hidden++;
            }
        }
        limited.put("Others (" + hidden + " more)", others);
        return limited;
    }

    /** One breakdown table: title, then Category | Records, striped rows, Total row. */
    private PdfPTable buildBreakdownTable(String heading, String firstHeader,
                                          Map<String, Long> counts, Font headerFont,
                                          Font cellFont, Font boldCellFont) throws Exception {
        Font titleFont = new Font(Font.FontFamily.HELVETICA, 10, Font.BOLD);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{7f, 1.6f});

        PdfPCell title = new PdfPCell(new Phrase(heading, titleFont));
        title.setColspan(2);
        title.setBorder(Rectangle.NO_BORDER);
        title.setPaddingLeft(0f);
        title.setPaddingBottom(4f);
        table.addCell(title);

        BaseColor navy = new BaseColor(26, 26, 46);
        BaseColor line = new BaseColor(226, 232, 240);
        BaseColor zebra = new BaseColor(248, 250, 252);
        BaseColor totalBg = new BaseColor(229, 231, 235);

        table.addCell(styledCell(firstHeader, headerFont, Element.ALIGN_LEFT, navy, navy));
        table.addCell(styledCell("Records", headerFont, Element.ALIGN_RIGHT, navy, navy));

        long total = counts.values().stream().mapToLong(Long::longValue).sum();
        int row = 0;
        for (Map.Entry<String, Long> e : counts.entrySet()) {
            BaseColor bg = (row++ % 2 == 1) ? zebra : BaseColor.WHITE;
            table.addCell(styledCell(e.getKey(), cellFont, Element.ALIGN_LEFT, bg, line));
            table.addCell(styledCell(String.valueOf(e.getValue()), cellFont, Element.ALIGN_RIGHT, bg, line));
        }

        table.addCell(styledCell("Total", boldCellFont, Element.ALIGN_LEFT, totalBg, line));
        table.addCell(styledCell(String.valueOf(total), boldCellFont, Element.ALIGN_RIGHT, totalBg, line));

        return table;
    }

    private PdfPCell styledCell(String text, Font font, int align, BaseColor background, BaseColor borderColor) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(align);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setBackgroundColor(background);
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderColor(borderColor);
        cell.setBorderWidth(0.5f);
        cell.setMinimumHeight(20f);   // same row height everywhere
        cell.setPaddingTop(4f);
        cell.setPaddingBottom(5f);
        cell.setPaddingLeft(6f);
        cell.setPaddingRight(6f);
        return cell;
    }

    @Async
    @Transactional
    public void generateAsync(ReportRequestDTO request, String actorId, String jobId) {
        ReportJob job = reportJobRepository.findById(jobId).orElse(null);
        if (job == null) return;

        try {
            job.setStatus("PROCESSING");
            reportJobRepository.save(job);

            List<ResearchOutput> data = buildFilteredDataset(request);
            byte[] bytes;
            String contentType;
            String extension;

            if ("PDF".equalsIgnoreCase(request.outputFormat())) {
                bytes = exportPDF(data, request);
                contentType = "application/pdf";
                extension = "pdf";
            } else {
                bytes = exportCSV(data);
                contentType = "text/csv";
                extension = "csv";
            }

            String key = "reports/" + UUID.randomUUID() + "." + extension;
            uploadToS3(bytes, key, contentType);
            String url = generatePresignedUrl(key);

            job.setStatus("COMPLETE");
            job.setS3Key(key);
            job.setDownloadUrl(url);
            job.setRecordCount(data.size());
            job.setCompletedAt(Instant.now());
            reportJobRepository.save(job);

        } catch (Exception e) {
            log.error("Async report generation failed for job {}: {}", jobId, e.getMessage());
            job.setStatus("FAILED");
            job.setErrorMessage(e.getMessage());
            reportJobRepository.save(job);
        }
    }

    public ReportResultDTO getStatus(String jobId) {
        ReportJob job = reportJobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));
        return new ReportResultDTO(job.getId(), job.getStatus(),
                job.getDownloadUrl(), null, job.getRecordCount(), job.getCompletedAt());
    }

    public List<ResearchOutput> buildFilteredDataset(ReportRequestDTO request) {
        return researchOutputRepository.findByStatus("APPROVED").stream()
                .filter(o -> {
                    if (request.yearFrom() != null && o.getCompletionYear() != null
                            && o.getCompletionYear() < request.yearFrom()) return false;
                    if (request.yearTo() != null && o.getCompletionYear() != null
                            && o.getCompletionYear() > request.yearTo()) return false;
                    if (request.researchTypes() != null && !request.researchTypes().isEmpty()
                            && !request.researchTypes().contains(o.getResearchType())) return false;
                    if (request.fundingSources() != null && !request.fundingSources().isEmpty()
                            && !request.fundingSources().contains(o.getFundingSource())) return false;
                    if (request.institutionId() != null && !request.institutionId().isBlank()
                            && o.getInstitution() != null
                            && !o.getInstitution().getId().equals(request.institutionId())) return false;
                    if (request.province() != null && !request.province().isBlank()
                            && o.getInstitution() != null
                            && !request.province().equalsIgnoreCase(o.getInstitution().getProvince())) return false;
                    return true;
                })
                .collect(Collectors.toList());
    }

    private byte[] exportCSV(List<ResearchOutput> data) throws Exception {
        StringWriter sw = new StringWriter();
        CSVPrinter printer = new CSVPrinter(sw, CSVFormat.DEFAULT.builder()
                .setHeader(
                        "Reference No.", "Title", "Research Type", "Completion Year",
                        "Funding Source", "Publication Venue/Status", "Institution", "Province",
                        "Authors", "ORCID iDs", "Abstract", "Keywords",
                        "Subject", "Coverage", "Rights",
                        "DOI"
                ).build()
        );
        for (ResearchOutput o : data) {
            String authors = o.getAuthors() == null ? "" :
                    o.getAuthors().stream().map(a -> a.getFullName() != null ? a.getFullName() : "")
                            .collect(Collectors.joining("; "));
            String orcids = o.getAuthors() == null ? "" :
                    o.getAuthors().stream().map(a -> a.getOrcidId() != null ? a.getOrcidId() : "")
                            .filter(v -> !v.isBlank())
                            .collect(Collectors.joining("; "));
            printer.printRecord(
                    o.getReferenceNumber(), o.getTitle(), o.getResearchType(),
                    o.getCompletionYear(), o.getFundingSource(), o.getPublicationVenue(),
                    o.getInstitution() != null ? o.getInstitution().getName() : "",
                    o.getInstitution() != null ? o.getInstitution().getProvince() : "",
                    authors, orcids, o.getAbstractText(), o.getKeywords(),
                    o.getSubjectDc(), o.getCoverageDc(), o.getRightsDc(),
                    o.getDoi()
            );
        }
        printer.flush();
        return sw.toString().getBytes();
    }

    private byte[] exportPDF(List<ResearchOutput> data, ReportRequestDTO request) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4.rotate());   // landscape for the whole report
        PdfWriter.getInstance(doc, baos);
        doc.open();

        Font titleFont = new Font(Font.FontFamily.HELVETICA, 14, Font.BOLD);
        Font sectionFont = new Font(Font.FontFamily.HELVETICA, 11, Font.BOLD);
        Font headerFont = new Font(Font.FontFamily.HELVETICA, 9, Font.BOLD, BaseColor.WHITE);
        Font cellFont = new Font(Font.FontFamily.HELVETICA, 8);

        doc.add(new Paragraph("DASIG — Regional Research Analytics Report", titleFont));
        doc.add(new Paragraph("DOST Region VII | Generated: " + Instant.now(),
                new Font(Font.FontFamily.HELVETICA, 9)));
        doc.add(Chunk.NEWLINE);

        // --- Section 1: Summary Table ---
        doc.add(new Paragraph("Summary", sectionFont));

        // --- Report configuration (the filters the user selected) ---
        addConfigSection(doc, request, data, sectionFont);
        doc.add(Chunk.NEWLINE);

        PdfPTable summaryTable = new PdfPTable(8);
        summaryTable.setWidthPercentage(100);
        summaryTable.setWidths(new float[]{2f, 4f, 3f, 2f, 2.5f, 1.2f, 2f, 2.5f});

        String[] summaryHeaders = {"Ref No.", "Title", "Author", "Type", "Subject Type", "Year", "Funding", "Institution"};
        for (String h : summaryHeaders) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(new BaseColor(26, 26, 46));
            cell.setPadding(5);
            summaryTable.addCell(cell);
        }

        for (ResearchOutput o : data) {
            summaryTable.addCell(new PdfPCell(new Phrase(o.getReferenceNumber() != null ? o.getReferenceNumber() : "", cellFont)));
            summaryTable.addCell(new PdfPCell(new Phrase(o.getTitle() != null ? o.getTitle() : "", cellFont)));
            summaryTable.addCell(new PdfPCell(new Phrase(joinAuthors(o, "; "), cellFont)));
            summaryTable.addCell(new PdfPCell(new Phrase(o.getResearchType() != null ? o.getResearchType() : "", cellFont)));
            summaryTable.addCell(new PdfPCell(new Phrase(o.getSubjectDc() != null ? o.getSubjectDc() : "", cellFont)));
            summaryTable.addCell(new PdfPCell(new Phrase(o.getCompletionYear() != null ? String.valueOf(o.getCompletionYear()) : "", cellFont)));
            summaryTable.addCell(new PdfPCell(new Phrase(o.getFundingSource() != null ? o.getFundingSource() : "", cellFont)));
            summaryTable.addCell(new PdfPCell(new Phrase(o.getInstitution() != null && o.getInstitution().getName() != null ? o.getInstitution().getName() : "", cellFont)));
        }

        doc.add(summaryTable);
        doc.add(Chunk.NEWLINE);
        doc.add(new Paragraph("Total Records: " + data.size(),
                new Font(Font.FontFamily.HELVETICA, 9, Font.ITALIC)));

        // --- Analytics: landscape, tables stacked vertically ---
        ReportStatsDTO stats = computeStats(data);
        doc.newPage();
        Paragraph analyticsHeading = new Paragraph("Analytics Summary", sectionFont);
        analyticsHeading.setSpacingAfter(8f);
        doc.add(analyticsHeading);

        Font boldCellFont = new Font(Font.FontFamily.HELVETICA, 8, Font.BOLD);

        addOverviewTable(doc, stats, headerFont, cellFont);
        addAnalyticsStack(doc, stats, headerFont, cellFont, boldCellFont);

        // --- Section 2: Detailed Records, ONE STUDY PER PAGE ---
        Font recordTitleFont = new Font(Font.FontFamily.HELVETICA, 11, Font.BOLD);
        Font recordCountFont = new Font(Font.FontFamily.HELVETICA, 8, Font.NORMAL, BaseColor.GRAY);
        Font labelFont = new Font(Font.FontFamily.HELVETICA, 8, Font.BOLD, BaseColor.DARK_GRAY);
        Font valueFont = new Font(Font.FontFamily.HELVETICA, 9);

        int index = 1;
        for (ResearchOutput o : data) {
            doc.newPage();   // every study starts on a fresh page

            if (index == 1) {
                Paragraph detailedHeading = new Paragraph("Detailed Records", sectionFont);
                detailedHeading.setSpacingAfter(8f);
                doc.add(detailedHeading);
            }

            Paragraph recordCount = new Paragraph("Record " + index + " of " + data.size(), recordCountFont);
            recordCount.setSpacingAfter(2f);
            doc.add(recordCount);
            doc.add(new Paragraph(o.getTitle() != null ? o.getTitle() : "Untitled", recordTitleFont));
            doc.add(new Paragraph(" "));

            String authors = o.getAuthors() == null ? "" :
                    o.getAuthors().stream().map(a -> a.getFullName() != null ? a.getFullName() : "")
                            .collect(Collectors.joining("; "));
            String orcids = o.getAuthors() == null ? "" :
                    o.getAuthors().stream().map(a -> a.getOrcidId() != null ? a.getOrcidId() : "")
                            .filter(v -> !v.isBlank())
                            .collect(Collectors.joining("; "));

            PdfPTable fieldTable = new PdfPTable(2);
            fieldTable.setWidthPercentage(100);
            fieldTable.setWidths(new float[]{1.4f, 4f});
            fieldTable.getDefaultCell().setBorder(Rectangle.NO_BORDER);

            String[][] fields = {
                    {"Reference No.", o.getReferenceNumber()},
                    {"Research Type", o.getResearchType()},
                    {"Completion Year", o.getCompletionYear() != null ? String.valueOf(o.getCompletionYear()) : ""},
                    {"Funding Source", o.getFundingSource()},
                    {"Publication Venue/Status", o.getPublicationVenue()},
                    {"Institution", o.getInstitution() != null ? o.getInstitution().getName() : ""},
                    {"Province", o.getInstitution() != null ? o.getInstitution().getProvince() : ""},
                    {"Authors", authors},
                    {"ORCID iD(s)", orcids},
                    {"Abstract", o.getAbstractText()},
                    {"Keywords", o.getKeywords()},
                    {"Subject", o.getSubjectDc()},
                    {"Coverage", o.getCoverageDc()},
                    {"Rights", o.getRightsDc()},
                    {"DOI", o.getDoi()},
            };
            for (String[] field : fields) {
                PdfPCell labelCell = new PdfPCell(new Phrase(field[0], labelFont));
                labelCell.setBorder(Rectangle.NO_BORDER);
                labelCell.setPaddingBottom(4);
                fieldTable.addCell(labelCell);

                PdfPCell valueCell = new PdfPCell(new Phrase(field[1] != null ? field[1] : "—", valueFont));
                valueCell.setBorder(Rectangle.NO_BORDER);
                valueCell.setPaddingBottom(4);
                fieldTable.addCell(valueCell);
            }

            doc.add(fieldTable);
            index++;
        }

        doc.close();
        return baos.toByteArray();
    }

    private void uploadToS3(byte[] bytes, String key, String contentType) {
        s3Client.putObject(
                PutObjectRequest.builder().bucket(BUCKET).key(key).contentType(contentType).build(),
                RequestBody.fromBytes(bytes)
        );
    }

    private String generatePresignedUrl(String key) {
        return s3Presigner.presignGetObject(GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(60))
                .getObjectRequest(r -> r.bucket(BUCKET).key(key))
                .build()).url().toString();
    }
}