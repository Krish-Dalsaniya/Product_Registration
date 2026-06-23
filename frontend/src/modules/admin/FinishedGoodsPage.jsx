import { useState, useEffect, useCallback } from 'react';
import { useFinishedGoods, useFinishedGoodsOptions, useCreateFinishedGood, useUpdateFinishedGood, useDeleteFinishedGood, useAddFinishedGoodStock } from '../../hooks/useFinishedGoods';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import ViewToggle from '../../components/shared/ViewToggle';
import { 
    Plus, 
    Search, 
    Box, 
    Cpu, 
    Zap, 
    CircuitBoard, 
    Layers, 
    Trash2, 
    Loader2, 
    CheckCircle2, 
    Fingerprint,
    ListPlus,
    Wrench,
    Binary,
    Pencil,
    LayoutGrid,
    List,
    ImageOff,
    Eye,
    PackagePlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import MultiSelectDropdown from '../../components/shared/MultiSelectDropdown';
import { useAuth } from '../../context/AuthContext';

const FinishedGoodsPage = ({ isEmbedded = false, defaultProductId = null, hideAddButton = false }) => {
    const { hasPermission } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
    const [viewMode, setViewMode] = useState('grid');

    const { data: itemsData, isLoading: itemsLoading } = useFinishedGoods({ page: pagination.page, limit: pagination.limit, search: searchTerm, product_id: defaultProductId });
    const { data: optionsData, isLoading: optionsLoading } = useFinishedGoodsOptions();

    const items = itemsData?.data || [];
    const options = optionsData || { products: [], pcb: [], electrical: [], electronics: [], structural: [] };
    const loading = itemsLoading || optionsLoading;

    useEffect(() => {
        if (itemsData?.meta) {
            setPagination(prev => ({ ...prev, total: itemsData?.meta?.total || 0 }));
        }
    }, [itemsData?.meta]);

    const createFinishedGoodMutation = useCreateFinishedGood();
    const updateFinishedGoodMutation = useUpdateFinishedGood();
    const deleteFinishedGoodMutation = useDeleteFinishedGood();
    const addStockMutation = useAddFinishedGoodStock();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
    const [addStockItem, setAddStockItem] = useState(null);
    const [stockQuantityToAdd, setStockQuantityToAdd] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [productId, setProductId] = useState(defaultProductId || '');
    const [quantity, setQuantity] = useState(1);
    const [version, setVersion] = useState('1.0');
    const [hardwareFeatures, setHardwareFeatures] = useState([]); // [{type: '', id: '', name: ''}]
    const [communicationDetails, setCommunicationDetails] = useState([]);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [editInterfaceIndex, setEditInterfaceIndex] = useState(null);
    const [builderState, setBuilderState] = useState({
        method: '',
        communicationProtocol: [],
        otaProtocol: [],
        dataFormat: []
    });
    const [powerController, setPowerController] = useState(false);
    const [motherboardId, setMotherboardId] = useState('');
    
    const COMMUNICATION_OPTIONS = ['wifi', 'bluetooth', 'gsm 2G', 'gsm 3G', 'gsm 4G', 'gsm 5G', 'ethernet', 'RS485', 'USB', 'RS232'];
    const COMMUNICATION_PROTOCOL_OPTIONS = ['MQTT', 'HTTP(Client)', 'HTTP(Server)', 'TCP/IP(Client)', 'TCP/IP(Server)', 'FTP'];
    const OTA_PROTOCOL_OPTIONS = ['MQTT', 'HTTP(Client)', 'HTTP(Server)', 'TCP/IP(Client)', 'TCP/IP(Server)', 'FTP'];
    const DATA_FORMAT_OPTIONS = ['JSON', 'TOON', 'CSV', 'MODBUS'];
    const [isIot, setIsIot] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [inventoryError, setInventoryError] = useState('');


    const [viewItem, setViewItem] = useState(null);

    const handleAddHardwareFeature = (type, id, name, stockQuantity = 0) => {
        if (!id) return;
        if (hardwareFeatures.some(f => f.type === type && f.id === id)) {
            toast.error('Component already added');
            return;
        }
        setInventoryError('');
        setHardwareFeatures([...hardwareFeatures, { type, id, name, stockQuantity }]);
    };

    const handleRemoveHardwareFeature = (index) => {
        setInventoryError('');
        setHardwareFeatures(hardwareFeatures.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!productId) {
            toast.error('Please select a product');
            return;
        }

        const requestedQuantity = Number.parseInt(quantity, 10) || 0;
        const inventoryShortage = hardwareFeatures.find((feature) => {
            if (feature.stockQuantity === undefined || feature.stockQuantity === null || feature.stockQuantity === '') {
                return false;
            }

            const availableQuantity = Number.parseInt(feature.stockQuantity, 10) || 0;
            return availableQuantity < requestedQuantity;
        });

        if (inventoryShortage) {
            const message = `${inventoryShortage.name} quantity is not enough in the inventory. Required ${requestedQuantity}, available ${inventoryShortage.stockQuantity || 0}.`;
            setInventoryError(message);
            toast.error(message);
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                product_id: productId,
                quantity: quantity,
                hardware_features: hardwareFeatures.map(f => ({ type: f.type, id: f.id })),
                communication_details: isIot ? communicationDetails : [],
                power_controller: isIot ? powerController : false,
                motherboard_id: isIot ? motherboardId : null,
                is_iot: isIot,
                version: version
            };

            if (editItem) {
                await updateFinishedGoodMutation.mutateAsync({ id: editItem.id || editItem.finished_good_id, data: payload });
                toast.success('Finished Good updated successfully');
            } else {
                await createFinishedGoodMutation.mutateAsync(payload);
                toast.success('Finished Good created successfully');
            }
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error(error);
            const errorCode = error?.response?.data?.error?.code;
            const errorMessage = error?.response?.data?.error?.message || error?.message || (editItem ? 'Failed to update finished good' : 'Failed to create finished good');
            
            if (errorCode === 'DUPLICATE_VERSION') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Version Already Exists',
                    text: errorMessage,
                    confirmButtonColor: 'var(--accent)',
                    confirmButtonText: 'Got it'
                });
            } else {
                setInventoryError(errorMessage);
                toast.error(errorMessage);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleView = (row) => {
        setViewItem(row);
        setIsModalOpen(true);
    };

    const handleEdit = (row) => {
        setEditItem(row);
        setProductId(row.product_id);
        setQuantity(row.quantity);
        setVersion(row.version || '1.0');
        setIsIot(row.is_iot);
        setInventoryError('');
        
        const mappedHardware = (row.hardware_features || []).map(h => {
            const groupItems = options[h.component_type] || [];
            const found = groupItems.find(item => item.id == h.component_id);
            return {
                type: h.component_type,
                id: h.component_id,
                name: found ? found.name : `ID: ${h.component_id}`,
                stockQuantity: found ? found.stock_quantity : 0
            };
        });
        setHardwareFeatures(mappedHardware);

        setCommunicationDetails(row.communication_details || []);
        setPowerController(row.power_controller || false);
        setMotherboardId(row.motherboard_id || '');

        setIsModalOpen(true);
    };

    const handleDelete = async (row) => {
        const result = await Swal.fire({
          title: 'Are you sure?',
          text: 'Are you sure you want to delete this finished good?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: 'var(--accent)',
          cancelButtonColor: '#ef4444',
          confirmButtonText: 'Yes, delete it!'
        });
        if (!result.isConfirmed) return;
        try {
            await deleteFinishedGoodMutation.mutateAsync(row.id || row.finished_good_id || row.id);
            toast.success('Finished Good deleted');
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete finished good');
        }
    };

    const handleAddStockClick = (row) => {
        setAddStockItem(row);
        setStockQuantityToAdd(1);
        setIsAddStockModalOpen(true);
    };

    const handleAddStockSubmit = async (e) => {
        e.preventDefault();
        try {
            await addStockMutation.mutateAsync({ id: addStockItem.id || addStockItem.finished_good_id, quantityToAdd: stockQuantityToAdd });
            toast.success(`Successfully added ${stockQuantityToAdd} to stock`);
            setIsAddStockModalOpen(false);
            setAddStockItem(null);
        } catch (error) {
            console.error(error);
            const errorMessage = error?.response?.data?.error?.message || 'Failed to add stock';
            toast.error(errorMessage);
        }
    };

    const resetForm = () => {
        setProductId(defaultProductId || '');
        setQuantity(1);
        setVersion('1.0');
        setHardwareFeatures([]);
        setCommunicationDetails([]);
        setIsBuilderOpen(false);
        setEditInterfaceIndex(null);
        setBuilderState({ method: '', communicationProtocol: [], otaProtocol: [], dataFormat: [] });
        setPowerController(false);
        setMotherboardId('');
        setIsIot(false);
        setEditItem(null);
        setInventoryError('');
    };

    const getComponentName = (type, id) => {
        const list = options[type] || [];
        const item = list.find(i => i.id == id);
        return item ? item.name : `ID: ${id}`;
    };

    const columns = [
        { 
            key: 'product_name', 
            label: 'Product', 
            render: (row) => (
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-main)]">
                            {row.product_name} <span className="opacity-70 font-medium text-[11px]">(v{row.version || '1.0'})</span>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${row.is_iot ? 'bg-[var(--border-glow)] text-[var(--accent)]' : 'bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-dim)]'}`}>
                            {row.is_iot ? 'IoT' : 'Non-IoT'}
                        </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">{row.product_code}</span>
                </div>
            )
        },
        { 
            key: 'quantity', 
            label: 'Quantity',
            render: (row) => <span className="font-black text-[var(--accent)]">{row.quantity}</span>
        },
        {
            key: 'version',
            label: 'Version',
            render: (row) => <span className="font-bold text-[var(--text-main)] px-2 py-1 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-md text-[10px]">{row.version || '1.0'}</span>
        },
        {
            key: 'features',
            label: 'Features',
            render: (row) => (
                <div className="flex flex-wrap gap-1.5 max-w-[450px]">
                    {row.hardware_features?.map((f, i) => (
                        <span key={i} className="px-2 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded text-[9px] uppercase font-bold text-[var(--text-main)] flex items-center gap-1 shadow-sm">
                            <span className="text-[var(--accent)] font-extrabold">{f.component_type}:</span>
                            <span>{getComponentName(f.component_type, f.component_id)}</span>
                        </span>
                    ))}
                    {row.is_iot && row.software_features?.map((f, i) => (
                        <span key={i} className="px-2 py-0.5 bg-[var(--border-glow)] border border-[var(--accent)] rounded text-[9px] uppercase font-bold text-[var(--accent)] flex items-center gap-1 shadow-sm">
                            <span className="font-extrabold">SW:</span>
                            <span>{f.feature_name}</span>
                        </span>
                    ))}
                </div>
            )
        },
        {
            key: 'serial_numbers',
            label: 'Serial Numbers',
            render: (row) => (
                <div className="max-w-[200px] overflow-hidden truncate text-[10px] text-[var(--text-dim)] font-mono">
                    {row.serial_numbers?.join(', ')}
                </div>
            )
        },
        {
            key: 'created_at',
            label: 'Created At',
            render: (row) => new Date(row.created_at).toLocaleDateString()
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
                <div className="flex items-center gap-1 justify-end">
                    {hasPermission('products', 'edit') && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleAddStockClick(row); }}
                            className="p-1.5 text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)] hover:text-white rounded-md transition-colors"
                            title="Quick Add Stock"
                        >
                            <PackagePlus size={14} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    // Stats calculation
    const totalComponentsUsed = items.reduce((acc, item) => acc + (item.hardware_features?.length || 0), 0);

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-8 p-2">
            {/* Product & Device Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1">
                        Select Product <span className="text-rose-500">*</span>
                    </label>
                    <select
                        className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-2xl px-5 py-4 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold appearance-none cursor-pointer disabled:opacity-50"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1.5rem center', backgroundRepeat: 'no-repeat' }}
                        value={productId}
                        onChange={(e) => { setProductId(e.target.value); setInventoryError(''); }}
                        required
                        disabled={!!defaultProductId && !editItem}
                    >
                        <option value="">Select a product...</option>
                        {options.products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1">
                        Device Type
                    </label>
                    <div className="flex bg-[var(--bg-workspace)] border border-[var(--border-color)] p-1 rounded-2xl h-[58px] items-center">
                        <button
                            type="button"
                            onClick={() => { setIsIot(false); setCommunicationDetails([]); setIsBuilderOpen(false); setPowerController(false); setMotherboardId(''); }}
                            className={`flex-1 py-3 rounded-xl transition-all duration-300 font-black text-[10px] uppercase tracking-widest ${!isIot ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            Non-IoT
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsIot(true)}
                            className={`flex-1 py-3 rounded-xl transition-all duration-300 font-black text-[10px] uppercase tracking-widest ${isIot ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            IoT
                        </button>
                    </div>
                </div>
            </div>

            {/* Hardware Features */}
            <div className="space-y-4">
                <label className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1">
                    Hardware Features
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { type: 'pcb', label: 'PCB', icon: Cpu, items: options.pcb },
                        { type: 'electrical', label: 'Electrical', icon: Zap, items: options.electrical },
                        { type: 'electronics', label: 'Electronics', icon: CircuitBoard, items: options.electronics },
                        { type: 'structural', label: 'Structural', icon: Layers, items: options.structural }
                    ].map((group) => (
                        <div key={group.type} className="space-y-2">
                            <div className="flex items-center gap-2 mb-1 px-1">
                                <group.icon size={14} className="text-[var(--accent)]" />
                                <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">{group.label}</span>
                            </div>
                            <select
                                className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[12px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold"
                                onChange={(e) => {
                                    const item = group.items.find(i => i.id == e.target.value);
                                    if (item) handleAddHardwareFeature(group.type, item.id, item.name, item.stock_quantity);
                                    e.target.value = "";
                                }}
                            >
                                <option value="">Select...</option>
                                {group.items.map(i => (
                                    <option key={i.id} value={i.id}>{i.name}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>

                {/* Selected Hardware List */}
                <div className="flex flex-wrap gap-2 pt-2">
                    {hardwareFeatures.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-color)] pl-3 pr-1 py-1.5 rounded-xl group hover:border-[var(--accent)] transition-all">
                            <span className="text-[10px] font-bold text-[var(--text-main)]">
                                <span className="text-[var(--accent)] uppercase mr-1">{f.type}:</span> {f.name}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleRemoveHardwareFeature(i)}
                                className="p-1 text-[var(--text-dim)] hover:text-rose-500 transition-colors"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    {hardwareFeatures.length === 0 && (
                        <p className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider italic">No hardware components selected</p>
                    )}
                </div>
            </div>

            {/* Software Features */}
            {isIot && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-2xl">
                    <label className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest">
                        Software Features
                    </label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Communication Interfaces Builder */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1">
                                Communication Interfaces
                            </label>
                            
                            {/* List added interfaces */}
                            <div className="space-y-3">
                                {communicationDetails.map((comm, idx) => (
                                    <div key={idx} className="p-4 border border-[var(--border-color)] bg-[var(--bg-workspace)] rounded-xl relative group shadow-sm hover:shadow-md transition-all duration-300">
                                        <div className="absolute top-3 right-3 flex items-center gap-2">
                                            <button type="button" onClick={() => { setBuilderState(comm); setEditInterfaceIndex(idx); setIsBuilderOpen(true); }} className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                                                <Pencil size={14} />
                                            </button>
                                            <button type="button" onClick={() => setCommunicationDetails(prev => prev.filter((_, i) => i !== idx))} className="text-[var(--text-muted)] hover:text-rose-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <h5 className="text-[12px] font-black uppercase text-[var(--accent)] tracking-widest mb-3 pr-12">{comm.method}</h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            {['communicationProtocol', 'otaProtocol', 'dataFormat'].map(key => (
                                                <div key={key}>
                                                    <span className="text-[9px] font-black uppercase text-[var(--text-dim)] block mb-1">
                                                        {key.replace('Protocol', ' Prot').replace('Format', ' Fmt')}
                                                    </span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {comm[key].length > 0 ? comm[key].map(p => (
                                                            <span key={p} className="px-1.5 py-0.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[9px] font-bold text-[var(--text-main)]">{p}</span>
                                                        )) : <span className="text-[9px] text-[var(--text-muted)] italic">None</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Builder Trigger */}
                            <button
                                type="button"
                                onClick={() => setIsBuilderOpen(true)}
                                className="w-full py-4 border-2 border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all font-bold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> Add Communication Interface
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Motherboard Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1">
                                    Motherboard (PCB)
                                </label>
                                <select
                                    className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold"
                                    value={motherboardId}
                                    onChange={(e) => setMotherboardId(e.target.value)}
                                >
                                    <option value="">Select a Motherboard...</option>
                                    {(options.pcb || []).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Power Controller Checkbox */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1">
                                    Power Controller
                                </label>
                                <label className="flex items-center gap-3 bg-[var(--bg-workspace)] border border-[var(--border-color)] p-4 rounded-xl cursor-pointer hover:border-[var(--accent)] transition-all group">
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={powerController}
                                        onChange={(e) => setPowerController(e.target.checked)}
                                    />
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${powerController ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-color)] bg-[var(--bg-card)] group-hover:border-[var(--accent)]'}`}>
                                        {powerController && <CheckCircle2 size={14} className="text-white" />}
                                    </div>
                                    <span className="text-[13px] font-bold text-[var(--text-main)]">Enable Power Controller</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quantity, Version & Serial Generation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 border-t border-[var(--border-color)]">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1">
                        Quantity
                    </label>
                    <input
                        type="number"
                        min="1"
                        className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-2xl px-5 py-4 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold font-mono"
                        value={quantity}
                        onChange={(e) => { setQuantity(e.target.value); setInventoryError(''); }}
                        required
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1">
                        Version
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. 1.0, 1.0.1, Rev B"
                        className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-2xl px-5 py-4 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1">
                        Serial Numbers
                    </label>
                    <div className="flex items-center gap-3 bg-[var(--bg-elevated)] border border-dashed border-[var(--border-color)] rounded-2xl px-5 py-3 text-[var(--text-dim)]">
                        <Fingerprint size={24} strokeWidth={1.5} className="text-[var(--accent)] opacity-50" />
                        <div className="flex-1">
                            <p className="text-[11px] font-black uppercase tracking-wider leading-none">Automatic Generation</p>
                            <p className="text-[9px] font-bold mt-1 opacity-70">Serials will be generated after save</p>
                        </div>
                    </div>
                </div>
            </div>

            {inventoryError && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm font-bold text-rose-500">
                    {inventoryError}
                </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-4 pt-4">
                <button
                    type="button"
                    onClick={() => { if(isEmbedded) resetForm(); else setIsModalOpen(false); }}
                    className="px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-3 bg-[var(--accent)] text-white px-10 py-4 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            {editItem ? 'Updating...' : 'Assembling...'}
                        </>
                    ) : (
                        <>
                            {editItem ? 'Update Finished Goods' : 'Save Finished Goods'}
                        </>
                    )}
                </button>
            </div>
        </form>
    );

    return (
        <div className={`space-y-6 max-w-[1600px] mx-auto ${!isEmbedded ? 'animate-in fade-in slide-in-from-bottom-4 duration-500' : ''}`}>
            {!isEmbedded && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-entrance-down">
                    <div className="flex items-center gap-5">
                        <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
                            <Box size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none ">Finished Goods</h1>
                        </div>
                    </div>

                    {hasPermission('products', 'create') && (
                        <button
                            type="button"
                            onClick={() => { resetForm(); setIsModalOpen(true); }}
                            className="btn-primary shadow-lg px-8 py-3 group hover-scale-md animate-glow"
                            style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
                        >
                            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span className="text-[12px] md:text-[14px]">Add Finished Good</span>
                        </button>
                    )}
                </div>
            )}



            {/* KPI Stats Grid - Hidden when embedded to save space */}
            {!isEmbedded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: 'Total Assembled', value: pagination.total || items.length, icon: Box, color: 'var(--badge-admin-text)', bg: 'var(--badge-admin-bg)' },
                    { title: 'IoT Devices', value: items.filter(i => i.is_iot).length, icon: Cpu, color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)' },
                    { title: 'Non-IoT Devices', value: items.filter(i => !i.is_iot).length, icon: Binary, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' },
                    { title: 'Components Integrated', value: totalComponentsUsed, icon: Wrench, color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.1)' }
                ].map((stat, idx) => (
                    <div key={idx} className="workspace-card p-4 border border-[var(--border-color)] group hover:shadow-md transition-all duration-300 outline-none rounded-2xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[13px] font-bold tracking-wider text-[var(--text-muted)] mb-0.5">{stat.title}</p>
                                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">{loading ? '...' : stat.value}</h3>
                            </div>
                            <div 
                                className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm"
                                style={{ background: stat.bg || 'var(--nav-hover)', color: stat.color || 'var(--accent)' }}
                            >
                                <stat.icon size={18} strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            )}

            <div className="workspace-card p-2.5 flex flex-col md:flex-row gap-3 items-center border border-[var(--border-color)] bg-[var(--bg-card)] rounded-xl">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={16} />
                    <input
                        type="text"
                        placeholder="Search by product name or code..."
                        className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg py-2 pl-10 pr-28 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 pointer-events-none hidden sm:block">{pagination.total} Records Found</div>
                </div>
                
                {isEmbedded && !hideAddButton && hasPermission('products', 'create') && (
                    <button
                        type="button"
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="btn-primary px-5 py-2.5 shrink-0"
                    >
                        <Plus size={16} className="mr-1" />
                        <span className="text-[11px]">Add Finished Good</span>
                    </button>
                )}
                
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>

            {viewMode === 'table' || viewMode === 'list' ? (
                <DataTable
                    columns={columns}
                    data={items}
                    loading={loading}
                    totalCount={pagination.total}
                    filteredCount={items.length}
                    currentPage={pagination.page}
                    totalPages={Math.ceil(pagination.total / pagination.limit) || 1}
                    onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                    onView={handleView}
                    onEdit={hasPermission('products', 'edit') ? handleEdit : undefined}
                    onDelete={hasPermission('products', 'delete') ? handleDelete : undefined}
                />
            ) : (
                <div className="space-y-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl">
                            <Box size={48} className="text-[var(--text-muted)] mb-4 opacity-50" />
                            <p className="text-[var(--text-dim)] font-medium">No finished goods found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
                            {items.map((item) => (
                                <div key={item.id} className="group flex flex-col h-full border border-[var(--border-color)] bg-[var(--bg-card)] rounded-[20px] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-[var(--accent)] hover:-translate-y-1 relative">
                                    <div onClick={() => handleView(item)} className="relative h-40 w-full overflow-hidden bg-gradient-to-b from-[var(--bg-workspace)] to-[var(--bg-card)] border-b border-[var(--border-color)] cursor-zoom-in">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.product_name} className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-700 ease-out" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[var(--text-dim)] opacity-20">
                                                <ImageOff size={48} strokeWidth={1} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleView(item); }} 
                                                className="w-10 h-10 bg-[var(--accent)] rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform transform translate-y-2 group-hover:translate-y-0" 
                                                title="View Details"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </div>
                                        <div className="absolute top-3 left-3">
                                            <span className={`backdrop-blur-md border border-white/20 text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full shadow-sm text-white ${item.is_iot ? 'bg-[var(--accent)]/90' : 'bg-slate-800/80'}`}>
                                                {item.is_iot ? 'IoT Device' : 'Non-IoT'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                <h3 className="text-[14px] font-black text-[var(--text-main)] leading-tight group-hover:text-[var(--accent)] transition-colors duration-300 line-clamp-2">
                                                    {item.product_name}
                                                </h3>
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-muted)] shrink-0">v{item.version || '1.0'}</span>
                                            </div>
                                            <p className="text-[10px] text-[var(--text-muted)] font-medium mb-3">
                                                ID: <span className="font-mono text-[11px]">{item.product_code}</span>
                                            </p>
                                            
                                            <div className="flex flex-wrap gap-1.5">
                                                {item.hardware_features?.slice(0, 2).map((f, i) => (
                                                    <span key={i} className="px-2 py-1 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-lg text-[9px] uppercase font-bold text-[var(--text-main)] truncate max-w-[160px] flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] opacity-70"></span>
                                                        <span className="opacity-70">{f.component_type}:</span> <span className="truncate">{getComponentName(f.component_type, f.component_id)}</span>
                                                    </span>
                                                ))}
                                                {(item.hardware_features?.length || 0) > 2 && (
                                                    <span className="px-2 py-1 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-[9px] uppercase font-bold text-[var(--text-dim)] flex items-center">
                                                        +{(item.hardware_features?.length || 0) - 2} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between pt-3 mt-4 border-t border-[var(--border-color)]/60">
                                            <div className="flex items-center gap-1.5">
                                                <div className="px-2.5 py-1 bg-[var(--accent)]/10 rounded-md">
                                                    <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-wider">
                                                        Qty: {item.quantity}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 transition-opacity">
                                                {hasPermission('products', 'edit') && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleAddStockClick(item); }}
                                                        className="w-7 h-7 flex items-center justify-center bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white rounded-md transition-all shadow-sm"
                                                        title="Quick Add Stock"
                                                    >
                                                        <PackagePlus size={12} />
                                                    </button>
                                                )}
                                                {hasPermission('products', 'edit') && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                                                        className="w-7 h-7 flex items-center justify-center bg-[var(--bg-workspace)] hover:bg-[var(--accent)] text-[var(--text-dim)] hover:text-white rounded-md transition-all shadow-sm"
                                                        title="Edit Finished Good"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                )}
                                                {hasPermission('products', 'delete') && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                                                        className="w-7 h-7 flex items-center justify-center bg-[var(--bg-workspace)] hover:bg-rose-500 text-[var(--text-dim)] hover:text-white rounded-md transition-all shadow-sm"
                                                        title="Delete Finished Good"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Grid Pagination */}
                    {items.length > 0 && Math.ceil(pagination.total / pagination.limit) > 1 && (
                        <div className="flex justify-center items-center gap-2 pt-4">
                            {Array.from({ length: Math.ceil(pagination.total / pagination.limit) }).map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setPagination(prev => ({ ...prev, page: idx + 1 }))}
                                    className={`w-8 h-8 rounded-lg text-[12px] font-black flex items-center justify-center transition-all ${pagination.page === idx + 1 ? 'bg-[var(--accent)] text-white shadow-md' : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'}`}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setViewItem(null); resetForm(); }}
                title={viewItem ? 'Finished Good Details' : editItem ? 'Edit Finished Good Assembly' : 'Assemble New Finished Good'}
                maxWidth="max-w-4xl"
            >
                {viewItem ? (
                    <div className="p-2 sm:p-6 space-y-8 bg-[var(--bg-card)]">
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
                                    {viewItem.product_name} <span className="opacity-70 font-bold text-xl">(v{viewItem.version || '1.0'})</span>
                                </h3>
                                <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${viewItem.is_iot ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-dim)]'}`}>
                                    {viewItem.is_iot ? 'IoT Device' : 'Non-IoT Device'}
                                </span>
                            </div>
                            <p className="text-sm font-medium text-[var(--text-dim)] mt-3">
                                Quantity: <span className="font-black text-[var(--accent)]">{viewItem.quantity}</span>
                                <span className="mx-3 opacity-20">|</span>
                                Version: <span className="font-black text-[var(--accent)]">{viewItem.version || '1.0'}</span>
                            </p>
                        </div>

                        <div>
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-dim)] mb-3">Hardware Features</h4>
                            <div className="space-y-2">
                                {viewItem.hardware_features?.map((h, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="px-2 py-0.5 border border-[var(--accent)]/30 bg-[var(--accent)]/5 rounded text-[9px] uppercase font-black text-[var(--accent)] min-w-[80px] text-center">{h.component_type}</span>
                                        <span className="text-sm font-bold text-[var(--text-main)]">{getComponentName(h.component_type, h.component_id)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {viewItem.is_iot && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-dim)] mb-2">Power Controller</h4>
                                        <p className="text-[15px] font-black text-[var(--text-main)]">{viewItem.power_controller ? 'Enabled' : 'Disabled'}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-dim)] mb-2">Motherboard</h4>
                                        <p className="text-[15px] font-black text-[var(--text-main)]">
                                            {viewItem.motherboard_id ? getComponentName('pcb', viewItem.motherboard_id) : 'None'}
                                        </p>
                                    </div>
                                </div>
                                
                                {(viewItem.communication_details || []).length > 0 && (
                                    <div className="space-y-4 pt-6 border-t border-[var(--border-color)]">
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-dim)]">Communication Interfaces</h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            {(viewItem.communication_details || []).map((comm, i) => (
                                                <div key={i} className="p-5 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-2xl">
                                                    <h5 className="text-[13px] font-black uppercase tracking-widest text-[var(--accent)] mb-4">{comm.method}</h5>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                                        <div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] block mb-2">Comm Protocol</span>
                                                            <div className="flex flex-wrap gap-2">{(comm.communicationProtocol || []).map(p => <span key={p} className="px-2 py-1 border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] text-[10px] font-bold text-[var(--text-main)]">{p}</span>)}</div>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] block mb-2">OTA Protocol</span>
                                                            <div className="flex flex-wrap gap-2">{(comm.otaProtocol || []).map(p => <span key={p} className="px-2 py-1 border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] text-[10px] font-bold text-[var(--text-main)]">{p}</span>)}</div>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] block mb-2">Data Format</span>
                                                            <div className="flex flex-wrap gap-2">{(comm.dataFormat || []).map(p => <span key={p} className="px-2 py-1 border border-[var(--border-color)] rounded-lg bg-[var(--bg-card)] text-[10px] font-bold text-[var(--text-main)]">{p}</span>)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {(viewItem.serial_numbers || []).length > 0 && (
                            <div className="pt-6 border-t border-[var(--border-color)]">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-dim)] mb-3">Serial Numbers</h4>
                                <div className="text-[13px] font-mono font-medium text-[var(--text-dim)] tracking-wide leading-relaxed">
                                    {(viewItem.serial_numbers || []).join(', ')}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    formContent
                )}
            </Modal>

            {/* Builder Popup Modal */}
            <Modal
                isOpen={isBuilderOpen}
                onClose={() => { setIsBuilderOpen(false); setEditInterfaceIndex(null); setBuilderState({ method: '', communicationProtocol: [], otaProtocol: [], dataFormat: [] }); }}
                title={editInterfaceIndex !== null ? "Edit Communication Interface" : "Add Communication Interface"}
                maxWidth="max-w-md"
            >
                <div className="space-y-6 pt-2">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1">Method</label>
                        <select
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] font-bold transition-colors"
                            value={builderState.method}
                            onChange={(e) => setBuilderState({...builderState, method: e.target.value})}
                        >
                            <option value="">Select Method...</option>
                            {COMMUNICATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    {builderState.method && (
                        <div className="space-y-5 animate-in fade-in zoom-in-95 pt-2 border-t border-[var(--border-color)]">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1">Comm Protocol</label>
                                <MultiSelectDropdown options={COMMUNICATION_PROTOCOL_OPTIONS} selectedOptions={builderState.communicationProtocol} onChange={(val) => setBuilderState({...builderState, communicationProtocol: val})} placeholder="Select Comm Protocols..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1">OTA Protocol</label>
                                <MultiSelectDropdown options={OTA_PROTOCOL_OPTIONS} selectedOptions={builderState.otaProtocol} onChange={(val) => setBuilderState({...builderState, otaProtocol: val})} placeholder="Select OTA Protocols..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1">Data Format</label>
                                <MultiSelectDropdown options={DATA_FORMAT_OPTIONS} selectedOptions={builderState.dataFormat} onChange={(val) => setBuilderState({...builderState, dataFormat: val})} placeholder="Select Data Formats..." />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                        <button
                            type="button"
                            onClick={() => { setIsBuilderOpen(false); setEditInterfaceIndex(null); setBuilderState({ method: '', communicationProtocol: [], otaProtocol: [], dataFormat: [] }); }}
                            className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={!builderState.method}
                            onClick={() => {
                                if (editInterfaceIndex !== null) {
                                    const updated = [...communicationDetails];
                                    updated[editInterfaceIndex] = builderState;
                                    setCommunicationDetails(updated);
                                } else {
                                    setCommunicationDetails([...communicationDetails, builderState]);
                                }
                                setIsBuilderOpen(false);
                                setEditInterfaceIndex(null);
                                setBuilderState({ method: '', communicationProtocol: [], otaProtocol: [], dataFormat: [] });
                            }}
                            className="px-8 py-3 bg-[var(--accent)] text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 hover:shadow-lg transition-all"
                        >
                            {editInterfaceIndex !== null ? 'Update Interface' : 'Save Interface'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Quick Add Stock Modal */}
            <Modal
                isOpen={isAddStockModalOpen}
                onClose={() => { setIsAddStockModalOpen(false); setAddStockItem(null); }}
                title="Quick Add Stock"
                maxWidth="max-w-md"
            >
                {addStockItem && (
                    <form onSubmit={handleAddStockSubmit} className="p-4 sm:p-6 space-y-6">
                        <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                            <h4 className="text-[13px] font-black text-[var(--text-main)] mb-1">{addStockItem.product_name} <span className="opacity-70 text-[11px]">(v{addStockItem.version || '1.0'})</span></h4>
                            <p className="text-[11px] font-medium text-[var(--text-muted)] font-mono">{addStockItem.product_code}</p>
                            <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 bg-[var(--accent)]/10 rounded-md">
                                <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-wider">
                                    Current Qty: {addStockItem.quantity}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1">
                                Quantity to Add <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-2xl px-5 py-4 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold font-mono"
                                value={stockQuantityToAdd}
                                onChange={(e) => setStockQuantityToAdd(e.target.value)}
                                required
                                autoFocus
                            />
                            <p className="text-[10px] font-medium text-[var(--text-muted)] ml-1">New serial numbers will be generated automatically for the added quantity.</p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]/60">
                            <button
                                type="button"
                                onClick={() => setIsAddStockModalOpen(false)}
                                className="px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-[0.1em] text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-workspace)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={addStockMutation.isLoading || stockQuantityToAdd < 1}
                                className="flex items-center gap-2 bg-[var(--accent)] text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-[0.1em] hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:scale-100"
                            >
                                {addStockMutation.isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <PackagePlus size={16} />
                                        Add Stock
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default FinishedGoodsPage;