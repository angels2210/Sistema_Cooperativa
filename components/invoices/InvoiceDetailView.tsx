import React, { useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, CompanyInfo, Client, Category } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { XIcon, PackageIcon, DownloadIcon } from '../icons/Icons';
import { calculateFinancialDetails } from '../../utils/financials';

interface InvoiceDetailViewProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice;
    companyInfo: CompanyInfo;
    clients: Client[];
    categories: Category[];
}

const InvoiceDetailView: React.FC<InvoiceDetailViewProps> = ({ isOpen, onClose, invoice, companyInfo, clients, categories }) => {
    
    const sender = clients.find(c => c.id === invoice.guide.sender.id) || invoice.guide.sender;
    const receiver = clients.find(c => c.id === invoice.guide.receiver.id) || invoice.guide.receiver;

    const financials = useMemo(() => calculateFinancialDetails(invoice.guide, companyInfo), [invoice, companyInfo]);
    const showPerItemTaxes = invoice.guide.merchandise.length > 3;

    const perItemFinancials = useMemo(() => {
        const itemDetails: { [key: number]: { iva: number; ipostel: number } } = {};
        if (!showPerItemTaxes) return itemDetails;
    
        const totalFreightBeforeDiscount = invoice.guide.merchandise.reduce((acc, item) => {
            const realWeight = Number(item.weight) || 0;
            const volumetricWeight = (Number(item.length) * Number(item.width) * Number(item.height)) / 5000;
            const chargeableWeight = Math.max(realWeight, volumetricWeight) * (Number(item.quantity) || 1);
            return acc + (chargeableWeight * (companyInfo.costPerKg || 0));
        }, 0);
    
        const freightForIpostel = invoice.guide.merchandise.reduce((acc, item) => {
            const realWeightPerUnit = Number(item.weight) || 0;
            const volWeightPerUnit = (Number(item.length) * Number(item.width) * Number(item.height)) / 5000;
            const chargeableWeightPerUnit = Math.max(realWeightPerUnit, volWeightPerUnit);
    
            if (chargeableWeightPerUnit > 0 && chargeableWeightPerUnit <= 30.99) {
                const itemFreight = (chargeableWeightPerUnit * (Number(item.quantity) || 1)) * (companyInfo.costPerKg || 0);
                return acc + itemFreight;
            }
            return acc;
        }, 0);
    
        if (totalFreightBeforeDiscount > 0) {
            invoice.guide.merchandise.forEach((item, index) => {
                const realWeightPerUnit = Number(item.weight) || 0;
                const volWeightPerUnit = (Number(item.length) * Number(item.width) * Number(item.height)) / 5000;
                const chargeableWeightPerUnit = Math.max(realWeightPerUnit, volWeightPerUnit);
                const totalChargeableWeight = chargeableWeightPerUnit * (Number(item.quantity) || 1);
                const itemFreight = totalChargeableWeight * (companyInfo.costPerKg || 0);
    
                const itemFreightProportion = itemFreight / totalFreightBeforeDiscount;
                const itemIVA = financials.iva * itemFreightProportion;
    
                let itemIPOSTEL = 0;
                if (chargeableWeightPerUnit > 0 && chargeableWeightPerUnit <= 30.99 && freightForIpostel > 0) {
                    const ipostelFreightContribution = itemFreight;
                    const itemIpostelProportion = ipostelFreightContribution / freightForIpostel;
                    itemIPOSTEL = financials.ipostel * itemIpostelProportion;
                }
    
                itemDetails[index] = { iva: itemIVA, ipostel: itemIPOSTEL };
            });
        }
        return itemDetails;
    }, [invoice.guide.merchandise, showPerItemTaxes, companyInfo, financials]);

    const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatUsd = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;


    const handleDownloadPdf = () => {
        const input = document.getElementById('invoice-to-print-display-only');
        if (!input) {
            console.error("Printable area not found!");
            return;
        }

        html2canvas(input, { scale: 2, useCORS: true }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            
            const ratio = canvasWidth / canvasHeight;
            let imgHeight = pdfWidth / ratio;
            
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight; // Negative position
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`factura-${invoice.invoiceNumber}.pdf`);
        });
    };

    const invoiceContent = (
        <div className="printable-area">
            <div id="invoice-to-print-display-only" className="bg-white text-black">
                <div className="p-4 md:p-8">
                    {/* Header */}
                    <div className="flex justify-between items-start pb-4 border-b-2 border-primary-500">
                        <div className="flex items-center">
                            <div className="p-2 bg-gray-100 rounded-lg mr-4 border">
                                {companyInfo.logoUrl ? (
                                    <img src={companyInfo.logoUrl} alt="Company Logo" className="h-16 w-auto" />
                                ) : (
                                    <PackageIcon className="h-12 w-12 text-primary-500" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-primary-700">{companyInfo.name}</h1>
                                <p className="text-xs">RIF: {companyInfo.rif}</p>
                                <p className="text-xs">Habilitación Postal: {companyInfo.postalLicense || 'N/A'}</p>
                                <p className="text-xs">{companyInfo.address}</p>
                                <p className="text-xs">Telf: {companyInfo.phone}</p>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                            <h2 className="text-4xl font-extrabold uppercase text-primary-700">FACTURA</h2>
                            <p className="mt-1"><strong>Nº:</strong> <span className="text-red-600 font-bold">{invoice.invoiceNumber}</span></p>
                            <p className="text-sm"><strong>Control:</strong> {invoice.controlNumber}</p>
                            <p className="text-sm"><strong>Fecha:</strong> {invoice.date}</p>
                        </div>
                    </div>

                    {/* Sender/Receiver Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="font-semibold border-b pb-1 mb-2">Remitente</h3>
                            <p className="font-bold text-lg">{sender.name}</p>
                            <p className="text-sm"><strong>CI/RIF:</strong> {sender.idNumber}</p>
                            <p className="text-sm"><strong>Telf:</strong> {sender.phone}</p>
                            <p className="text-sm"><strong>Email:</strong> {sender.email || 'N/A'}</p>
                            <p className="text-sm">{sender.address}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="font-semibold border-b pb-1 mb-2">Destinatario</h3>
                            <p className="font-bold text-lg">{receiver.name}</p>
                            <p className="text-sm"><strong>CI/RIF:</strong> {receiver.idNumber}</p>
                            <p className="text-sm"><strong>Telf:</strong> {receiver.phone}</p>
                            <p className="text-sm"><strong>Email:</strong> {receiver.email || 'N/A'}</p>
                            <p className="text-sm">{receiver.address}</p>
                        </div>
                    </div>
                    {/* Shipping Conditions */}
                    <div className="mt-6 border-t border-b py-2 text-xs grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div><strong>Condición Pago:</strong> {invoice.guide.paymentType === 'flete-pagado' ? 'Flete Pagado' : 'Flete a Destino'}</div>
                        <div><strong>Moneda Pago:</strong> {invoice.guide.paymentCurrency}</div>
                        <div><strong>Tiene Seguro:</strong> {invoice.guide.hasInsurance ? 'Sí' : 'No'}</div>
                        {invoice.guide.hasInsurance && <div><strong>Valor Declarado:</strong> {formatCurrency(invoice.guide.declaredValue)}</div>}
                    </div>
                    
                    {/* Items Table */}
                    <div className="mt-8 overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead className="bg-primary-500 text-black">
                                <tr>
                                    {showPerItemTaxes ? (
                                        <>
                                            <th className="px-2 py-2 text-left font-semibold uppercase tracking-wider">Descripción</th>
                                            <th className="px-2 py-2 text-center font-semibold uppercase tracking-wider">Cant</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider">P.Fact.(kg)</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider">Flete</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider">IVA</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider">IPOSTEL</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-2 py-2 text-left font-semibold uppercase tracking-wider">Descripción</th>
                                            <th className="px-2 py-2 text-center font-semibold uppercase tracking-wider">Cantidad</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider">Peso Real (kg/u)</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider">Peso Vol. (kg/u)</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider" title="El mayor valor entre Peso Real y Peso Volumétrico, multiplicado por la cantidad.">Peso Facturado (kg)</th>
                                            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider">Monto Flete</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {invoice.guide.merchandise.map((item, index) => {
                                    const realWeightPerUnit = Number(item.weight) || 0;
                                    const volWeightPerUnit = (Number(item.length) * Number(item.width) * Number(item.height)) / 5000;
                                    const chargeableWeightPerUnit = Math.max(realWeightPerUnit, volWeightPerUnit);
                                    const totalChargeableWeight = chargeableWeightPerUnit * (Number(item.quantity) || 1);
                                    const itemFreight = totalChargeableWeight * (companyInfo.costPerKg || 0);
                                    const categoryName = categories.find(c => c.id === item.categoryId)?.name || 'N/A';
                                    const itemTaxes = perItemFinancials[index] || { iva: 0, ipostel: 0 };

                                    return (
                                        <tr key={index} className="hover:bg-gray-50 text-black">
                                            <td className="px-2 py-2 align-top whitespace-normal">
                                                <div className="font-semibold">{item.description}</div>
                                                <div>Categoría: {categoryName}</div>
                                            </td>
                                            <td className="px-2 py-2 text-center align-top">{item.quantity}</td>
                                            
                                            {showPerItemTaxes ? (
                                                <>
                                                    <td className="px-2 py-2 text-right align-top font-bold">{totalChargeableWeight.toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-right align-top font-medium">{formatCurrency(itemFreight)}</td>
                                                    <td className="px-2 py-2 text-right align-top">{formatCurrency(itemTaxes.iva)}</td>
                                                    <td className="px-2 py-2 text-right align-top">{formatCurrency(itemTaxes.ipostel)}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-2 py-2 text-right align-top">{realWeightPerUnit.toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-right align-top">{volWeightPerUnit.toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-right align-top font-bold">{totalChargeableWeight.toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-right align-top font-medium">{formatCurrency(itemFreight)}</td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mt-6">
                        <div className="w-full max-w-sm space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Monto del Flete:</span>
                                <span className="font-medium">{formatCurrency(financials.freight)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Manejo de Mercancía:</span>
                                <span className="font-medium">{formatCurrency(financials.handling)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Monto de Seguro:</span>
                                <span className="font-medium">{formatCurrency(financials.insuranceCost)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-base border-t-2 border-gray-300 pt-2 mt-2">
                                <span className="">Base Imponible:</span>
                                <span className="">{formatCurrency(financials.subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>IVA (16%):</span>
                                <span className="font-medium">{formatCurrency(financials.iva)}</span>
                            </div>
                            {financials.ipostel > 0 &&
                                <div className="flex justify-between">
                                    <span>Aporte Ipostel:</span>
                                    <span className="font-medium">{formatCurrency(financials.ipostel)}</span>
                                </div>
                            }
                            {financials.igtf > 0 &&
                                <div className="flex justify-between">
                                    <span>IGTF (3%):</span>
                                    <span className="font-medium">{formatCurrency(financials.igtf)}</span>
                                </div>
                            }
                            <div className="flex justify-between items-center bg-primary-600 text-white p-4 rounded-lg mt-4">
                                <span className="text-lg font-bold">TOTAL A PAGAR:</span>
                                <span className="text-2xl font-extrabold">{formatCurrency(financials.total)}</span>
                            </div>
                             {companyInfo.bcvRate && companyInfo.bcvRate > 0 && (
                                <div className="text-right pr-2 mt-2 pt-2 border-t text-black">
                                    <p className="text-xs">
                                        <span className="font-semibold">Tasa BCV:</span> {companyInfo.bcvRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                                    </p>
                                    <p className="text-sm font-bold">
                                        <span className="font-semibold">Equivalente:</span> {formatUsd(financials.total / companyInfo.bcvRate)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalle de Factura: ${invoice.invoiceNumber}`} size="4xl">
            {invoiceContent}
            <div className="flex justify-end space-x-3 p-4 border-t dark:border-gray-700">
                <Button type="button" variant="secondary" onClick={onClose}>
                    <XIcon className="w-4 h-4 mr-2" />Cerrar
                </Button>
                <Button type="button" variant="secondary" onClick={handleDownloadPdf}>
                    <DownloadIcon className="w-4 h-4 mr-2" />Descargar PDF
                </Button>
            </div>
        </Modal>
    );
};

export default InvoiceDetailView;