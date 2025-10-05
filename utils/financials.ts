
import { ShippingGuide, CompanyInfo, Financials, Invoice } from '../types';

/**
 * Calculates all financial details for a given shipping guide.
 * This centralized function ensures consistency across the application.
 * @param guide The shipping guide containing all merchandise and shipping details.
 * @param companyInfo The company's configuration, including cost per kg.
 * @returns A Financials object with all calculated values.
 */
export const calculateFinancialDetails = (guide: ShippingGuide, companyInfo: CompanyInfo): Financials => {
    // Return zeroed financials if there's no merchandise or guide
    if (!guide || !guide.merchandise) {
        return { freight: 0, insuranceCost: 0, handling: 0, discount: 0, subtotal: 0, ipostel: 0, iva: 0, igtf: 0, total: 0 };
    }

    // Calculate total chargeable weight (max of real vs. volumetric)
    const totalWeight = guide.merchandise.reduce((acc, item) => {
        const realWeight = Number(item.weight) || 0;
        const volumetricWeight = (Number(item.length) * Number(item.width) * Number(item.height)) / 5000;
        return acc + Math.max(realWeight, volumetricWeight) * (Number(item.quantity) || 1);
    }, 0);

    const freight = totalWeight * (companyInfo.costPerKg || 0);

    // Calculate discount from freight value
    const discountAmount = guide.hasDiscount
        ? freight * ((Number(guide.discountPercentage) || 0) / 100)
        : 0;

    const freightAfterDiscount = freight - discountAmount;
    
    // Insurance is calculated on the declared value
    const insuranceCost = guide.hasInsurance ? (Number(guide.declaredValue) || 0) * ((Number(guide.insurancePercentage) || 0) / 100) : 0;
    
    const handling = totalWeight > 0 ? 10 : 0; // A fixed handling fee

    const subtotal = freightAfterDiscount + insuranceCost + handling;
    
    // IPOSTEL is calculated based on the freight value for packages under a certain weight.
    const freightForIpostel = guide.merchandise.reduce((acc, item) => {
        const realWeight = Number(item.weight) || 0;
        const volumetricWeight = (Number(item.length) * Number(item.width) * Number(item.height)) / 5000;
        const chargeableWeightPerUnit = Math.max(realWeight, volumetricWeight);

        if (chargeableWeightPerUnit > 0 && chargeableWeightPerUnit <= 30.99) {
            const quantity = Number(item.quantity) || 1;
            const itemFreight = (chargeableWeightPerUnit * (companyInfo.costPerKg || 0)) * quantity;
            return acc + itemFreight;
        }
        return acc;
    }, 0);

    const ipostel = freightForIpostel * 0.06;
    
    // IVA is now 0 as per cooperative rules
    const iva = 0;

    const preIgtfTotal = subtotal + ipostel + iva;

    // IGTF (3%) is applied if the payment currency is USD
    const igtf = guide.paymentCurrency === 'USD' ? preIgtfTotal * 0.03 : 0;
    
    const total = preIgtfTotal + igtf;

    return { freight, insuranceCost, handling, discount: discountAmount, subtotal, ipostel, iva, igtf, total };
};


/**
 * Calculates the total chargeable weight for a given invoice.
 * @param invoice The invoice object.
 * @returns The total chargeable weight in Kg.
 */
export const calculateInvoiceChargeableWeight = (invoice: Invoice): number => {
    if (!invoice || !invoice.guide || !invoice.guide.merchandise) {
        return 0;
    }
    return invoice.guide.merchandise.reduce((acc, item) => {
        const realWeight = Number(item.weight) || 0;
        const volumetricWeight = (Number(item.length) * Number(item.width) * Number(item.height)) / 5000;
        return acc + Math.max(realWeight, volumetricWeight) * (Number(item.quantity) || 1);
    }, 0);
};