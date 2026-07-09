import React, { useState, useEffect } from 'react';
import { Download, Award, Loader2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import Modal from '../../../../components/shared/Modal';

import { getCertificateHtml } from '../../../../utils/certificateTemplate';

const CertificateModal = ({ isOpen, onClose, assignment }) => {
    const [pdfDataUri, setPdfDataUri] = useState(null);

    useEffect(() => {
        if (isOpen && assignment) {
            setPdfDataUri(null); // Reset when a new one is opened
            const generatePreview = async () => {
                try {
                    const element = document.createElement('div');
                    element.innerHTML = getCertificateHtml(assignment);

                    const opt = {
                        margin: 0,
                        filename: 'preview.pdf',
                        image: { type: 'jpeg', quality: 1 },
                        html2canvas: { scale: 2, useCORS: true, logging: false },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
                    };

                    const pdfBase64 = await html2pdf().set(opt).from(element).outputPdf('datauristring');
                    setPdfDataUri(pdfBase64);
                } catch (error) {
                    console.error("Error generating PDF preview:", error);
                }
            };
            // Small delay to ensure modal animation completes before heavy CPU task
            setTimeout(generatePreview, 100);
        }
    }, [isOpen, assignment]);

    if (!isOpen || !assignment) return null;

    const handleDownload = () => {
        if (!pdfDataUri) return;
        const link = document.createElement('a');
        link.href = pdfDataUri;
        link.download = `${assignment.employee_name.replace(/\s+/g, '_')}_Certificate_${assignment.module_title.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const headerActions = (
        <button
            onClick={handleDownload}
            disabled={!pdfDataUri}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-md font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
        >
            {!pdfDataUri ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Download PDF
        </button>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`${assignment.module_title} - Certificate`}
            maxWidth="max-w-6xl"
            headerActions={headerActions}
        >
            <div className="w-full h-[82vh] bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-[var(--border-color)] relative">
                {pdfDataUri ? (
                    <embed 
                        src={pdfDataUri} 
                        type="application/pdf" 
                        className="absolute inset-0 w-full h-full border-0"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 gap-4 h-full">
                        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" />
                        <p className="font-medium">Generating secure PDF...</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default CertificateModal;
