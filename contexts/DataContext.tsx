
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { 
    Invoice, Client, Vehicle, Expense, InventoryItem, Asset, AssetCategory, Supplier,
    PaymentStatus, ShippingStatus, MasterStatus, Asociado, Certificado, PagoAsociado, ReciboPagoAsociado, Remesa, AsientoManual 
} from '../types';
import { useToast } from '../components/ui/ToastProvider';
import { useSystem } from './SystemContext';
import { useAuth } from './AuthContext';
import { apiFetch } from '../utils/api';
import { deriveInventoryFromInvoices } from '../utils/inventory';

type DataContextType = {
    invoices: Invoice[];
    clients: Client[];
    suppliers: Supplier[];
    vehicles: Vehicle[];
    expenses: Expense[];
    inventory: InventoryItem[];
    assets: Asset[];
    assetCategories: AssetCategory[];
    asociados: Asociado[];
    certificados: Certificado[];
    pagosAsociados: PagoAsociado[];
    recibosPagoAsociados: ReciboPagoAsociado[];
    remesas: Remesa[];
    asientosManuales: AsientoManual[];
    isLoading: boolean;
    handleSaveClient: (client: Client) => Promise<void>;
    handleDeleteClient: (clientId: string) => Promise<void>;
    handleSaveSupplier: (supplier: Supplier) => Promise<void>;
    handleDeleteSupplier: (supplierId: string) => Promise<void>;
    handleSaveInvoice: (invoice: Omit<Invoice, 'status' | 'paymentStatus' | 'shippingStatus'>) => Promise<Invoice | null>;
    handleUpdateInvoice: (updatedInvoice: Invoice) => Promise<Invoice | null>;
    handleUpdateInvoiceStatuses: (invoiceId: string, newStatuses: { paymentStatus?: PaymentStatus, shippingStatus?: ShippingStatus, status?: MasterStatus }) => Promise<void>;
    handleDeleteInvoice: (invoiceId: string) => Promise<void>;
    handleSaveVehicle: (vehicle: Vehicle) => Promise<void>;
    handleDeleteVehicle: (vehicleId: string) => Promise<void>;
    handleAssignToVehicle: (invoiceIds: string[], vehicleId: string) => Promise<void>;
    handleUnassignInvoice: (invoiceId: string) => Promise<void>;
    handleDispatchVehicle: (vehicleId: string) => Promise<Remesa | null>;
    onUndoDispatch: (vehicleId: string) => Promise<void>;
    handleFinalizeTrip: (vehicleId: string) => Promise<void>;
    handleSaveExpense: (expense: Expense) => Promise<void>;
    handleDeleteExpense: (expenseId: string) => Promise<void>;
    handleSaveAsset: (asset: Asset) => Promise<void>;
    handleDeleteAsset: (assetId: string) => Promise<void>;
    handleSaveAssetCategory: (category: AssetCategory) => Promise<void>;
    handleDeleteAssetCategory: (categoryId: string) => Promise<void>;
    handleSaveAsociado: (asociado: Asociado) => Promise<void>;
    handleDeleteAsociado: (asociadoId: string) => Promise<void>;
    handleSaveCertificado: (certificado: Certificado) => Promise<void>;
    handleDeleteCertificado: (certificadoId: string) => Promise<void>;
    handleSavePagoAsociado: (pago: PagoAsociado) => Promise<void>;
    handleDeletePagoAsociado: (pagoId: string) => Promise<void>;
    handleSaveRecibo: (recibo: ReciboPagoAsociado) => Promise<void>;
    handleDeleteRemesa: (remesaId: string) => Promise<void>;
    handleSaveAsientoManual: (asiento: AsientoManual) => Promise<void>;
    handleDeleteAsientoManual: (asientoId: string) => Promise<void>;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { addToast } = useToast();
    const { logAction } = useSystem();
    const { isAuthenticated, currentUser } = useAuth();

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
    const [asociados, setAsociados] = useState<Asociado[]>([]);
    const [certificados, setCertificados] = useState<Certificado[]>([]);
    const [pagosAsociados, setPagosAsociados] = useState<PagoAsociado[]>([]);
    const [recibosPagoAsociados, setRecibosPagoAsociados] = useState<ReciboPagoAsociado[]>([]);
    const [remesas, setRemesas] = useState<Remesa[]>([]);
    const [asientosManuales, setAsientosManuales] = useState<AsientoManual[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const fetchData = async () => {
            if (isAuthenticated && currentUser) {
                try {
                    setIsLoading(true);
                    const [
                        invoicesData, clientsData, suppliersData, vehiclesData, expensesData,
                        assetsData, assetCategoriesData, asociadosData, remesasData, asientosManualesData
                    ] = await Promise.all([
                        apiFetch<Invoice[]>('/invoices'), apiFetch<Client[]>('/clients'), apiFetch<Supplier[]>('/suppliers'),
                        apiFetch<Vehicle[]>('/vehicles'), apiFetch<Expense[]>('/expenses'), apiFetch<Asset[]>('/assets'),
                        apiFetch<AssetCategory[]>('/asset-categories'), apiFetch<Asociado[]>('/asociados'), apiFetch<Remesa[]>('/remesas'),
                        apiFetch<AsientoManual[]>('/asientos-manuales')
                    ]);
                    setInvoices(invoicesData); setClients(clientsData); setSuppliers(suppliersData);
                    setVehicles(vehiclesData); setExpenses(expensesData); setAssets(assetsData);
                    setAssetCategories(assetCategoriesData); setAsociados(asociadosData);
                    setRemesas(remesasData);
                    setAsientosManuales(asientosManualesData);
                    
                    const derivedInventory = deriveInventoryFromInvoices(invoicesData);
                    setInventory(derivedInventory);
                    
                    const [certsData, pagosData, recibosData] = await Promise.all([
                        apiFetch<Certificado[]>('/asociados/certificados'),
                        apiFetch<PagoAsociado[]>('/asociados/pagos'),
                        apiFetch<ReciboPagoAsociado[]>('/asociados/recibos')
                    ]);
                    setCertificados(certsData);
                    setPagosAsociados(pagosData);
                    setRecibosPagoAsociados(recibosData);

                } catch (error: any) {
                    addToast({ type: 'error', title: 'Error de Carga', message: `No se pudieron cargar los datos de la aplicación: ${error.message}` });
                } finally {
                    setIsLoading(false);
                }
            } else if (!isAuthenticated) {
                setInvoices([]); setClients([]); setSuppliers([]); setVehicles([]); setExpenses([]);
                setAssets([]); setAssetCategories([]); setAsociados([]); setCertificados([]);
                setPagosAsociados([]); setRecibosPagoAsociados([]); setRemesas([]); setInventory([]);
                setAsientosManuales([]);
                setIsLoading(false);
            }
        };
        fetchData();
    }, [isAuthenticated, currentUser, addToast]);

    const handleGenericSave = async <T extends { id?: string; }>(item: T, endpoint: string, stateSetter: React.Dispatch<React.SetStateAction<T[]>>, itemType: string): Promise<void> => {
        const isUpdating = !!item.id;
        const url = isUpdating ? `${endpoint}/${item.id}` : endpoint;
        const method = isUpdating ? 'PUT' : 'POST';

        const bodyToSend = { ...item };
        if (!isUpdating) {
            delete (bodyToSend as Partial<T>).id;
        }

        try {
            const savedItem = await apiFetch<T>(url, { method, body: JSON.stringify(bodyToSend) });
            stateSetter(prev => isUpdating ? prev.map(i => (i as any).id === (savedItem as any).id ? savedItem : i) : [...prev, savedItem]);
            const displayName = (item as any).name || (item as any).nombre || (item as any).modelo || (item as any).description || (item as any).concepto || (item as any).comprobanteNumero || itemType;
            addToast({ type: 'success', title: `${itemType} Guardado`, message: `'${displayName}' se ha guardado.` });
        } catch (error: any) { addToast({ type: 'error', title: `Error al Guardar ${itemType}`, message: error.message }); }
    };

    const handleGenericDelete = async (id: string, endpoint: string, stateSetter: React.Dispatch<React.SetStateAction<any[]>>, itemType: string) => {
        try {
            await apiFetch(`${endpoint}/${id}`, { method: 'DELETE' });
            stateSetter(prev => prev.filter(item => item.id !== id));
            addToast({ type: 'success', title: `${itemType} Eliminado`, message: `El elemento ha sido eliminado.` });
        } catch (error: any) { addToast({ type: 'error', title: `Error al Eliminar ${itemType}`, message: error.message }); }
    };
    
    const handleSaveClient = (client: Client) => handleGenericSave(client, '/clients', setClients, 'Cliente');
    const handleDeleteClient = (id: string) => handleGenericDelete(id, '/clients', setClients, 'Cliente');
    const handleSaveSupplier = (supplier: Supplier) => handleGenericSave(supplier, '/suppliers', setSuppliers, 'Proveedor');
    const handleDeleteSupplier = (id: string) => handleGenericDelete(id, '/suppliers', setSuppliers, 'Proveedor');
    const handleSaveVehicle = (vehicle: Vehicle) => handleGenericSave(vehicle, '/vehicles', setVehicles, 'Vehículo');
    const handleDeleteVehicle = (id: string) => handleGenericDelete(id, '/vehicles', setVehicles, 'Vehículo');
    const handleSaveExpense = (expense: Expense) => handleGenericSave(expense, '/expenses', setExpenses, 'Gasto');
    const handleDeleteExpense = (id: string) => handleGenericDelete(id, '/expenses', setExpenses, 'Gasto');
    const handleSaveAsset = (asset: Asset) => handleGenericSave(asset, '/assets', setAssets, 'Bien');
    const handleDeleteAsset = (id: string) => handleGenericDelete(id, '/assets', setAssets, 'Bien');
    const handleSaveAssetCategory = (cat: AssetCategory) => handleGenericSave(cat, '/asset-categories', setAssetCategories, 'Categoría de Bien');
    const handleDeleteAssetCategory = (id: string) => handleGenericDelete(id, '/asset-categories', setAssetCategories, 'Categoría de Bien');
    const handleSaveAsociado = (asociado: Asociado) => handleGenericSave(asociado, '/asociados', setAsociados, 'Asociado');
    const handleDeleteAsociado = (id: string) => handleGenericDelete(id, '/asociados', setAsociados, 'Asociado');
    const handleSaveCertificado = (cert: Certificado) => handleGenericSave(cert, '/asociados/certificados', setCertificados, 'Certificado');
    const handleDeleteCertificado = (id: string) => handleGenericDelete(id, '/asociados/certificados', setCertificados, 'Certificado');
    const handleSavePagoAsociado = (pago: PagoAsociado) => handleGenericSave(pago, '/asociados/pagos', setPagosAsociados, 'Pago de Asociado');
    const handleDeletePagoAsociado = (id: string) => handleGenericDelete(id, '/asociados/pagos', setPagosAsociados, 'Pago de Asociado');
    const handleSaveRecibo = (recibo: ReciboPagoAsociado) => handleGenericSave(recibo, '/asociados/recibos', setRecibosPagoAsociados, 'Recibo');
    const handleSaveAsientoManual = (asiento: AsientoManual) => handleGenericSave(asiento, '/asientos-manuales', setAsientosManuales, 'Asiento Manual');
    const handleDeleteAsientoManual = (id: string) => handleGenericDelete(id, '/asientos-manuales', setAsientosManuales, 'Asiento Manual');

    const handleSaveInvoice = async (invoiceData: Omit<Invoice, 'status' | 'paymentStatus' | 'shippingStatus'>): Promise<Invoice | null> => {
        if (!currentUser) return null;
        try {
            const invoiceToSend = { ...invoiceData };
            delete (invoiceToSend as Partial<Invoice>).id;

            const newInvoice = await apiFetch<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(invoiceToSend) });
            setInvoices(prev => [newInvoice, ...prev]);
            const newInventory = deriveInventoryFromInvoices([newInvoice, ...invoices]);
            setInventory(newInventory);
            logAction(currentUser, 'CREAR_FACTURA', `Creó la factura ${newInvoice.invoiceNumber}.`, newInvoice.id);
            addToast({ type: 'success', title: 'Factura Guardada', message: `Factura ${newInvoice.invoiceNumber} creada.` });
            return newInvoice;
        } catch (error: any) { 
            addToast({ type: 'error', title: 'Error al Guardar Factura', message: error.message });
            return null;
        }
    };
    
    const handleUpdateInvoice = async (updatedInvoice: Invoice): Promise<Invoice | null> => {
        if (!currentUser) return null;
        try {
            const savedInvoice = await apiFetch<Invoice>(`/invoices/${updatedInvoice.id}`, { method: 'PUT', body: JSON.stringify(updatedInvoice) });
            const updatedInvoices = invoices.map(inv => inv.id === savedInvoice.id ? savedInvoice : inv);
            setInvoices(updatedInvoices);
            const updatedInventory = deriveInventoryFromInvoices(updatedInvoices);
            setInventory(updatedInventory);
            logAction(currentUser, 'ACTUALIZAR_FACTURA', `Actualizó la factura ${savedInvoice.invoiceNumber}.`, savedInvoice.id);
            addToast({ type: 'success', title: 'Factura Actualizada', message: `Factura ${savedInvoice.invoiceNumber} actualizada.` });
            return savedInvoice;
        } catch (error: any) { 
            addToast({ type: 'error', title: 'Error al Actualizar Factura', message: error.message });
            return null;
        }
    };

    const handleUpdateInvoiceStatuses = async (invoiceId: string, newStatuses: { paymentStatus?: PaymentStatus, shippingStatus?: ShippingStatus, status?: MasterStatus }) => {
        if (!currentUser) return;
        try {
            const updatedInvoice = await apiFetch<Invoice>(`/invoices/${invoiceId}`, { method: 'PUT', body: JSON.stringify({ ...invoices.find(i => i.id === invoiceId), ...newStatuses }) });
            setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
            logAction(currentUser, 'CAMBIAR_ESTADO_FACTURA', `Cambió estado de factura ${updatedInvoice.invoiceNumber}.`, invoiceId);
            addToast({ type: 'info', title: 'Estado Actualizado', message: `La factura ${updatedInvoice.invoiceNumber} ha sido actualizada.` });
        } catch (error: any) { addToast({ type: 'error', title: 'Error al Cambiar Estado', message: error.message }); }
    };

    const handleDeleteInvoice = async (id: string) => { await handleGenericDelete(id, '/invoices', setInvoices, 'Factura'); };
    
    const handleAssignToVehicle = async (invoiceIds: string[], vehicleId: string) => {
        try {
            const response = await apiFetch<{ updatedInvoices: Invoice[] }>(`/vehicles/${vehicleId}/assign-invoices`, { method: 'POST', body: JSON.stringify({ invoiceIds }) });
            
            if (response && Array.isArray(response.updatedInvoices)) {
                const updatedInvoicesMap = new Map(response.updatedInvoices.map(inv => [inv.id, inv]));
                setInvoices(prev => prev.map(inv => updatedInvoicesMap.get(inv.id) || inv));
                addToast({ type: 'info', title: 'Envíos Asignados', message: `${invoiceIds.length} factura(s) asignadas.` });
            } else {
                throw new Error('La respuesta del servidor no fue la esperada al asignar facturas.');
            }
        } catch (error: any) { addToast({ type: 'error', title: 'Error al Asignar', message: error.message }); }
    };

    const handleUnassignInvoice = async (invoiceId: string) => {
        try {
            const invoice = invoices.find(i => i.id === invoiceId);
            if (!invoice || !invoice.vehicleId) return;
            const response = await apiFetch<{ updatedInvoice: Invoice }>(`/vehicles/${invoice.vehicleId}/unassign-invoice`, { method: 'POST', body: JSON.stringify({ invoiceId }) });

            if (response && response.updatedInvoice && typeof response.updatedInvoice === 'object') {
                setInvoices(prev => prev.map(inv => inv.id === response.updatedInvoice.id ? response.updatedInvoice : inv));
                addToast({ type: 'info', title: 'Envío Desasignado', message: `La factura ha sido removida.` });
            } else {
                throw new Error('La respuesta del servidor no fue la esperada al desasignar factura.');
            }
        } catch (error: any) { addToast({ type: 'error', title: 'Error al Desasignar', message: error.message }); }
    };

    const handleDispatchVehicle = async (vehicleId: string): Promise<Remesa | null> => {
        if (!currentUser) return null;
        try {
            const response = await apiFetch<{ updatedInvoices: Invoice[], updatedVehicle: Vehicle, newRemesa: Remesa }>(`/vehicles/${vehicleId}/dispatch`, { method: 'POST' });
            
            if (response && Array.isArray(response.updatedInvoices) && response.updatedVehicle && response.newRemesa) {
                const { updatedInvoices, updatedVehicle, newRemesa } = response;
                setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
                
                const updatedInvoicesMap = new Map(updatedInvoices.map(inv => [inv.id, inv]));
                setInvoices(prev => prev.map(inv => updatedInvoicesMap.get(inv.id) || inv));
                
                setRemesas(prev => [newRemesa, ...prev]);
                
                logAction(currentUser, 'DESPACHAR_VEHICULO', `Despachó el vehículo ${updatedVehicle.placa}.`, vehicleId);
                addToast({ type: 'success', title: 'Vehículo Despachado', message: `Remesa ${newRemesa.remesaNumber} generada.` });
                return newRemesa;
            } else {
                 throw new Error('La respuesta del servidor no fue la esperada al despachar.');
            }
        } catch (error: any) { 
            addToast({ type: 'error', title: 'Error al Despachar', message: error.message });
            return null;
        }
    };

    const onUndoDispatch = async (vehicleId: string) => { /* TODO: Implement API call */ };
    
    const handleFinalizeTrip = async (vehicleId: string) => { 
        try {
            const response = await apiFetch<{ updatedVehicle: Vehicle, updatedInvoices: Invoice[] }>(`/vehicles/${vehicleId}/finalize-trip`, { method: 'POST' });
            
            if (response && response.updatedVehicle && Array.isArray(response.updatedInvoices)) {
                const { updatedVehicle, updatedInvoices } = response;
                setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
                const updatedInvoicesMap = new Map(updatedInvoices.map(inv => [inv.id, inv]));
                setInvoices(prev => prev.map(inv => updatedInvoicesMap.get(inv.id) || inv));
                addToast({ type: 'success', title: 'Viaje Finalizado', message: `El vehículo ${updatedVehicle.placa} está disponible.` });
            } else {
                throw new Error('La respuesta del servidor no fue la esperada al finalizar viaje.');
            }
        } catch(error: any) {
            addToast({ type: 'error', title: 'Error al Finalizar Viaje', message: error.message });
        }
    };
    
    const handleDeleteRemesa = async (remesaId: string) => {
        if (!currentUser) return;
        if (!window.confirm("¿Está seguro de que desea eliminar esta remesa? Las facturas asociadas volverán al estado 'Pendiente para Despacho'. Esta acción no se puede deshacer.")) {
            return;
        }
        try {
            const response = await apiFetch<{ updatedVehicle?: Vehicle, updatedInvoices?: Invoice[] }>(`/remesas/${remesaId}`, { method: 'DELETE' });

            setRemesas(prev => prev.filter(r => r.id !== remesaId));
            
            if (response && response.updatedVehicle) {
                setVehicles(prev => prev.map(v => v.id === response.updatedVehicle!.id ? response.updatedVehicle! : v));
            }
            if (response && Array.isArray(response.updatedInvoices)) {
                const updatedInvoicesMap = new Map(response.updatedInvoices.map(inv => [inv.id, inv]));
                setInvoices(prev => prev.map(inv => updatedInvoicesMap.get(inv.id) || inv));
            }
            
            logAction(currentUser, 'ELIMINAR_REMESA', `Eliminó la remesa ${remesaId}.`, remesaId);
            addToast({ type: 'success', title: 'Remesa Eliminada', message: 'La remesa ha sido eliminada y las facturas revertidas.' });

        } catch (error: any) {
            addToast({ type: 'error', title: 'Error al Eliminar Remesa', message: error.message });
        }
    };


    const value: DataContextType = {
        invoices, clients, suppliers, vehicles, expenses, inventory, assets, assetCategories, 
        asociados, certificados, pagosAsociados, recibosPagoAsociados, remesas, asientosManuales, isLoading,
        handleSaveClient, handleDeleteClient, handleSaveSupplier, handleDeleteSupplier, handleSaveInvoice, 
        handleUpdateInvoice, handleUpdateInvoiceStatuses, handleDeleteInvoice, handleSaveVehicle, 
        handleDeleteVehicle, handleAssignToVehicle, handleUnassignInvoice, handleDispatchVehicle, 
        onUndoDispatch, handleFinalizeTrip, handleSaveExpense, handleDeleteExpense, handleSaveAsset, 
        handleDeleteAsset, handleSaveAssetCategory, handleDeleteAssetCategory,
        handleSaveAsociado, handleDeleteAsociado, handleSaveCertificado, handleDeleteCertificado,
        handleSavePagoAsociado, handleDeletePagoAsociado, handleSaveRecibo,
        handleDeleteRemesa, handleSaveAsientoManual, handleDeleteAsientoManual
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within a DataProvider');
    return context;
};
