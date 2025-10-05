

import React from 'react';
import { Invoice, Client, Category, Office, ShippingType, PaymentMethod, CompanyInfo, User } from '../../types';
import InvoiceForm from '../invoices/InvoiceForm';

interface ShippingGuideViewProps {
    // FIX: Corrected the onSaveInvoice prop type to match what InvoiceForm expects for creating invoices.
    onSaveInvoice: (invoice: Omit<Invoice, 'status' | 'paymentStatus' | 'shippingStatus'>) => Promise<Invoice | null>;
    categories: Category[];
    clients: Client[];
    offices: Office[];
    shippingTypes: ShippingType[];
    paymentMethods: PaymentMethod[];
    companyInfo: CompanyInfo;
    currentUser: User;
}

const ShippingGuideView: React.FC<ShippingGuideViewProps> = (props) => {
    return (
        <div>
            <InvoiceForm
                onSave={props.onSaveInvoice}
                clients={props.clients}
                categories={props.categories}
                offices={props.offices}
                shippingTypes={props.shippingTypes}
                paymentMethods={props.paymentMethods}
                companyInfo={props.companyInfo}
                currentUser={props.currentUser}
            />
        </div>
    );
};

export default ShippingGuideView;