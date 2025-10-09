import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PrintNodeConfig {
	apiKey: string;
	printerId: string;
}

export class PDFService {
	private printNodeConfig: PrintNodeConfig | null = null;

	constructor(printNodeConfig?: PrintNodeConfig) {
		this.printNodeConfig = printNodeConfig || null;
	}

	/**
	 * Generate PDF from HTML element
	 */
	async generatePDF(elementId: string, filename?: string): Promise<Blob> {
		const element = document.getElementById(elementId);
		if (!element) {
			throw new Error(`Element with id "${elementId}" not found`);
		}

		// Debug: Log element dimensions and footer
		console.log('Element dimensions:', {
			scrollWidth: element.scrollWidth,
			scrollHeight: element.scrollHeight,
			offsetHeight: element.offsetHeight,
			clientHeight: element.clientHeight
		});
		
		// Check if footer exists
		const footer = element.querySelector('.mt-8.text-center');
		console.log('Footer found:', footer);
		if (footer) {
			console.log('Footer text:', footer.textContent);
		}

		// Create canvas from HTML element
		const canvas = await html2canvas(element, {
			useCORS: true,
			allowTaint: true,
			background: '#ffffff',
			width: element.scrollWidth,
			height: element.scrollHeight + 120, // Use scrollHeight to include all content
			onclone: (clonedDoc) => {
				// Override problematic oklch colors with RGB equivalents
				const style = clonedDoc.createElement('style');
				style.textContent = `
					/* Override oklch colors with RGB equivalents */
					.bg-white { background-color: #ffffff !important; }
					.bg-gray-50 { background-color: #f9fafb !important; }
					.bg-gray-100 { background-color: #f3f4f6 !important; }
					.bg-gray-200 { background-color: #e5e7eb !important; }
					.bg-gray-300 { background-color: #d1d5db !important; }
					.bg-gray-400 { background-color: #9ca3af !important; }
					.bg-gray-500 { background-color: #6b7280 !important; }
					.bg-gray-600 { background-color: #4b5563 !important; }
					.bg-gray-700 { background-color: #374151 !important; }
					.bg-gray-800 { background-color: #1f2937 !important; }
					.bg-gray-900 { background-color: #111827 !important; }
					
					.text-gray-500 { color: #6b7280 !important; }
					.text-gray-600 { color: #4b5563 !important; }
					.text-gray-700 { color: #374151 !important; }
					.text-gray-900 { color: #111827 !important; }
					.text-black { color: #000000 !important; }
					.text-white { color: #ffffff !important; }
					
					.border-gray-200 { border-color: #e5e7eb !important; }
					.border-gray-300 { border-color: #d1d5db !important; }
					
					/* Force addresses to be side-by-side for PDF */
					.address-grid {
						display: grid !important;
						grid-template-columns: 1fr 1fr !important;
						gap: 2rem !important;
					}
					
					/* Make everything bigger for PDF */
					body {
						font-size: 18px !important;
					}
					
					#logo {
						max-width: 400px !important;
						height: auto !important;
					}
					
					.address-grid p {
						margin-bottom: 0.4rem !important;
						font-size: 18px !important;
					}
					
					.address-grid h4 {
						margin-bottom: 0.75rem !important;
						font-weight: 600 !important;
						font-size: 20px !important;
					}
					
					.text-2xl {
						font-size: 32px !important;
					}
					
					.invoice-table th, .invoice-table td {
						font-size: 16px !important;
					}
					
					.mt-8 {
						margin-top: 3rem !important;
						padding-bottom: 2rem !important;
						min-height: 100px !important;
					}
					
					.text-center {
						text-align: center !important;
					}
					
					.text-gray-600 {
						color: #4b5563 !important;
						font-size: 16px !important;
						margin-bottom: 0.5rem !important;
					}
					
					.text-gray-500 {
						color: #6b7280 !important;
						font-size: 14px !important;
					}
					
					.text-sm {
						font-size: 14px !important;
					}
					
					.space-y-2 > * + * {
						margin-top: 0.5rem !important;
					}
					
					/* Force footer to be visible */
					div.mt-8.text-center {
						display: block !important;
						visibility: visible !important;
						opacity: 1 !important;
						position: relative !important;
					}
					
					/* Ensure proper text rendering */
					body, * {
						-webkit-font-smoothing: antialiased;
						-moz-osx-font-smoothing: grayscale;
					}
					
					/* Fix any remaining oklch issues by forcing RGB */
					* {
						background-color: inherit !important;
						color: inherit !important;
						border-color: inherit !important;
					}
				`;
				clonedDoc.head.appendChild(style);
			}
		} as any);

		// Create PDF with optimized PNG (better compatibility with PrintNode)
		const imgData = canvas.toDataURL('image/png', 0.9); // Use PNG with 90% quality for better compatibility
		const pdf = new jsPDF({
			orientation: 'portrait',
			unit: 'mm',
			format: 'a4',
			compress: true // Enable PDF compression
		});

		// Calculate dimensions to fit page with minimal margins
		const pageWidth = 210; // A4 width in mm
		const pageHeight = 297; // A4 height in mm
		const margin = 10; // Minimal margin to fit footer
		const contentWidth = pageWidth - (margin * 2);
		const contentHeight = pageHeight - (margin * 2);
		
		// Calculate image dimensions to fit content properly
		const imgWidth = contentWidth;
		const imgHeight = (canvas.height * imgWidth) / canvas.width;
		
		// Scale to fit page height if needed, but don't exceed it
		let finalImgWidth = imgWidth;
		let finalImgHeight = imgHeight;
		
		if (imgHeight > pageHeight - margin * 2) {
			// Scale down to fit page height
			const scaleFactor = (pageHeight - margin * 2) / imgHeight;
			finalImgWidth = imgWidth * scaleFactor;
			finalImgHeight = imgHeight * scaleFactor;
		}
		
		// Add image to page with calculated dimensions
		pdf.addImage(imgData, 'PNG', margin, margin, finalImgWidth, finalImgHeight);

		// Convert to blob
		const pdfBlob = pdf.output('blob');
		return pdfBlob;
	}

	/**
	 * Download PDF file
	 */
	async downloadPDF(elementId: string, filename: string = 'invoice.pdf'): Promise<void> {
		try {
			const pdfBlob = await this.generatePDF(elementId, filename);
			
			// Create download link
			const url = URL.createObjectURL(pdfBlob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Error generating PDF:', error);
			throw error;
		}
	}

	/**
	 * Print PDF using PrintNode
	 */
	async printPDF(elementId: string, filename: string = 'invoice.pdf'): Promise<void> {
		try {
			const pdfBlob = await this.generatePDF(elementId, filename);
			
			// Convert blob to base64
			const base64 = await this.blobToBase64(pdfBlob);
			
			// Send to PrintNode
			await this.sendToPrintNode(base64, filename);
		} catch (error) {
			console.error('Error printing PDF:', error);
			throw error;
		}
	}

	/**
	 * Convert blob to base64
	 */
	async blobToBase64(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result as string;
				// Remove data:application/pdf;base64, prefix
				const base64 = result.split(',')[1];
				resolve(base64);
			};
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}

	/**
	 * Send PDF to PrintNode for printing
	 */
	async sendToPrintNode(base64Pdf: string, filename: string): Promise<void> {
		console.log('Sending to PrintNode:', {
			filename: filename,
			pdfLength: base64Pdf.length,
			pdfPreview: base64Pdf.substring(0, 50) + '...'
		});

		const response = await fetch('/api/print', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				pdf: base64Pdf,
				filename: filename
			})
		});

		console.log('PrintNode response status:', response.status);

		if (!response.ok) {
			const error = await response.json();
			console.error('PrintNode error response:', error);
			throw new Error(`PrintNode error: ${error.error || error.message || 'Unknown error'}`);
		}

		const result = await response.json();
		console.log('PrintNode success response:', result);
	}

	/**
	 * Set PrintNode configuration
	 */
	setPrintNodeConfig(config: PrintNodeConfig): void {
		this.printNodeConfig = config;
	}
}

// Export singleton instance
export const pdfService = new PDFService();