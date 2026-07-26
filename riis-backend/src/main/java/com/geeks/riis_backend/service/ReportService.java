package com.geeks.riis_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geeks.riis_backend.dto.ReportResultDTO;
import com.geeks.riis_backend.dto.SubmissionSummaryDTO;
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
import java.util.List;
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
                bytes = exportPDF(data);
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

    public List<SubmissionSummaryDTO> previewFilteredDataset(ReportRequestDTO request) {
        return buildFilteredDataset(request).stream()
                .limit(5)
                .map(o -> new SubmissionSummaryDTO(
                        o.getId(),
                        o.getReferenceNumber(),
                        o.getTitle(),
                        o.getResearchType(),
                        o.getFundingSource(),
                        o.getCompletionYear(),
                        o.getCreatedAt(),
                        o.getStatus(),
                        o.getInstitution() != null ? o.getInstitution().getId() : null,
                        o.getInstitution() != null ? o.getInstitution().getName() : null,
                        o.getAuthors() == null ? null
                                : o.getAuthors().stream()
                                .map(com.geeks.riis_backend.model.Author::getFullName)
                                .filter(name -> name != null && !name.isBlank())
                                .collect(Collectors.joining(", "))
                ))
                .collect(Collectors.toList());
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
                bytes = exportPDF(data);
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
                        "Dublin Core Subject", "Dublin Core Coverage", "Dublin Core Rights",
                        "DOI", "Status"
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
                    o.getDoi(), o.getStatus()
            );
        }
        printer.flush();
        return sw.toString().getBytes();
    }

    private byte[] exportPDF(List<ResearchOutput> data) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4.rotate());
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
        doc.add(Chunk.NEWLINE);

        PdfPTable summaryTable = new PdfPTable(6);
        summaryTable.setWidthPercentage(100);
        summaryTable.setWidths(new float[]{2f, 5f, 2f, 1.5f, 2f, 2.5f});

        String[] summaryHeaders = {"Ref No.", "Title", "Type", "Year", "Funding", "Institution"};
        for (String h : summaryHeaders) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(new BaseColor(26, 26, 46));
            cell.setPadding(5);
            summaryTable.addCell(cell);
        }

        for (ResearchOutput o : data) {
            summaryTable.addCell(new PdfPCell(new Phrase(o.getReferenceNumber() != null ? o.getReferenceNumber() : "", cellFont)));
            summaryTable.addCell(new PdfPCell(new Phrase(o.getTitle() != null ? o.getTitle() : "", cellFont)));
            summaryTable.addCell(new PdfPCell(new Phrase(o.getResearchType() != null ? o.getResearchType() : "", cellFont)));
            summaryTable.addCell(new PdfPCell(new Phrase(o.getCompletionYear() != null ? String.valueOf(o.getCompletionYear()) : "", cellFont)));
            summaryTable.addCell(new PdfPCell(new Phrase(o.getFundingSource() != null ? o.getFundingSource() : "", cellFont)));
            summaryTable.addCell(new PdfPCell(new Phrase(o.getInstitution() != null && o.getInstitution().getName() != null ? o.getInstitution().getName() : "", cellFont)));
        }

        doc.add(summaryTable);
        doc.add(Chunk.NEWLINE);
        doc.add(new Paragraph("Total Records: " + data.size(),
                new Font(Font.FontFamily.HELVETICA, 9, Font.ITALIC)));

        // --- Section 2: Detailed Record Sheets ---
        doc.newPage();
        doc.add(new Paragraph("Detailed Records", sectionFont));
        doc.add(Chunk.NEWLINE);

        Font recordTitleFont = new Font(Font.FontFamily.HELVETICA, 11, Font.BOLD);
        Font labelFont = new Font(Font.FontFamily.HELVETICA, 8, Font.BOLD, BaseColor.DARK_GRAY);
        Font valueFont = new Font(Font.FontFamily.HELVETICA, 9);

        int index = 1;
        for (ResearchOutput o : data) {
            doc.add(new Paragraph(index + ". " + (o.getTitle() != null ? o.getTitle() : "Untitled"), recordTitleFont));
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
                    {"Dublin Core Subject", o.getSubjectDc()},
                    {"Dublin Core Coverage", o.getCoverageDc()},
                    {"Dublin Core Rights", o.getRightsDc()},
                    {"DOI", o.getDoi()},
                    {"Status", o.getStatus()},
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
            doc.add(Chunk.NEWLINE);
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