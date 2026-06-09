// frontend/src/pages/AdminPage.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  exportData,
  importData,
  resetToDefault,
  applyBulkDiscount,
} from '../utils/storage';
import { logout } from '../utils/auth';
import { importProductsFromCSV } from '../utils/importCSV';
import { importProductsFromExcel } from '../utils/importExcel';
import AdminOrdersList from './AdminOrdersList';
import { getPendingPartners, approvePartner, rejectPartner } from '../utils/customerAuth';
import ContactRequests from '../components/admin/ContactRequests';
import StatsRegistration from '../components/admin/StatsRegistration';
import {
  getBrands,
  addBrand,
  updateBrand,
  deleteBrand,
  toggleBrandEnabled,
  ensureBrandExists,
} from '../utils/brands';
import {
  getTags,
  addTag,
  updateTag,
  deleteTag,
  toggleTagEnabled,
  ensureTagExists,
} from '../utils/tags';
import { getSiteSettings, setSalesMode, setLandingTags } from '../utils/siteSettings';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../utils/employeeAuth';
import { PERMISSIONS, PERMISSIONS_LIST } from '../utils/permissions';
import {
  getBlogPosts,
  addBlogPost,
  updateBlogPost,
  deleteBlogPost,
  toggleHomepageDisplay,
} from '../utils/blog';
import {
  getProductTemplates,
  addProductTemplate,
  updateProductTemplate,
  deleteProductTemplate,
} from '../utils/productTemplates';
import CreateQuotePage from './CreateQuotePage';
import QuotesListPage from './QuotesListPage';
import './AdminPage.css';
import { getCurrentUserRole } from '../utils/customerAuth';

const AdminPage = () => {
  const [products, setProducts] = useState([]);
  const [salesMode, setSalesMode] = useState('cart')
  const userRole = getCurrentUserRole()
  const [blogPosts, setBlogPosts] = useState([])
  const [availableBrands, setAvailableBrands] = useState([])
  const [showCustomerDetailModal, setShowCustomerDetailModal] = useState(false);
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState(null);
  const [customerQuotes, setCustomerQuotes] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [discountOnly, setDiscountOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');


  const [ioFormat, setIoFormat] = useState('json');
  const [selectedFile, setSelectedFile] = useState(null);

  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [allQuotes, setAllQuotes] = useState([]);
  const [loadingAllQuotes, setLoadingAllQuotes] = useState(false);
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('');

  // اضافه کن به state های اولیه
  const [brandLogoFile, setBrandLogoFile] = useState(null);
  const [brandLogoPreview, setBrandLogoPreview] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // اضافه کردن به state های بالای کامپوننت
  const [showCustomerStatsModal, setShowCustomerStatsModal] = useState(false);
  const [showOrderStatusModal, setShowOrderStatusModal] = useState(false);
  const [customerStatsData, setCustomerStatsData] = useState({
    today: 0,
    week: 0,
    month: 0
  });
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // دریافت لیست پشتیبانان فروش
  const loadSupportAgents = async () => {
    setLoadingSupportAgents(true);
    try {
      const res = await fetch('/api/experts/all');
      const data = await res.json();
      if (data.success) {
        setSupportAgents(data.data);
      }
    } catch (err) {
      console.error('Error loading support agents:', err);
    } finally {
      setLoadingSupportAgents(false);
    }
  };

  // ========== stateهای مربوط به کارخانه‌ها ==========
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const [brandFormData, setBrandFormData] = useState({
    name: '',
    logo: '',
    address: '',
    description: '',
    website: '',
    phone: '',
    email: '',
    enabled: true
  });

  // اضافه کردن به state های بالای کامپوننت
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportData, setReportData] = useState({
    totalAmount: 0,
    totalOrders: 0,
    orders: []
  });
  const [loadingReport, setLoadingReport] = useState(false);
  // اضافه کردن به state های بالای کامپوننت
  const [salesChartData, setSalesChartData] = useState([]);
  const [monthlySalesData, setMonthlySalesData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);
  // در بخش state های بالای AdminPage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // ========== stateهای مربوط به پشتیبانان فروش ==========
const [supportAgents, setSupportAgents] = useState([]);
const [loadingSupportAgents, setLoadingSupportAgents] = useState(false);
const [showSupportForm, setShowSupportForm] = useState(false);
const [editingSupportId, setEditingSupportId] = useState(null);
const [supportSearchTerm, setSupportSearchTerm] = useState('');
const [supportFormData, setSupportFormData] = useState({
  name: '',
  phone: '',
  photo: '',
  is_active: true,
  department: 'فروش',
  order_priority: 1
});
    

  const [form, setForm] = useState({
    productCode: '',
    grade: '',
    name: '',
    price: '',
    partnerPrice: '',
    discount: '',
    stock: '',
    description: '',
    manufacturer: '',
    glazeType: '',
    glaze: '',
    suitableFor: '',
    category: '',
    size: '',
    color: '',
    images: '',
    fullDescription: '',
    tags: [],
    audience: 'all',
  });

  const imagePreview = form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : [];

  const [managers, setManagers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [teamForm, setTeamForm] = useState({ name: '', description: '', supervisor_id: '' });
  const [availableSupervisors, setAvailableSupervisors] = useState([]);

  

  // ========== stateهای مربوط به درخواست‌های قیمت ==========
  const [priceRequests, setPriceRequests] = useState([]);
  const [loadingPriceRequests, setLoadingPriceRequests] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();  // <-- این خط رو اضافه کن
  const categorySelectRef = useRef(null);

  const [duplicateModal, setDuplicateModal] = useState({
    isOpen: false,
    productName: '',
    onResolve: null,
  });
  const [pendingPartners, setPendingPartners] = useState([]);
  const [brands, setBrands] = useState([]);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandForm, setBrandForm] = useState({
    name: '',
    logo: '',
    address: '',
    description: '',
    website: '',
    phone: '',
    email: '',
    enabled: true,
  });

  const [tags, setTags] = useState([]);
  const [editingTag, setEditingTag] = useState(null);
  const [tagForm, setTagForm] = useState('');
  const [siteSettings, setSiteSettings] = useState({ salesMode: 'cart' });
  const [tempSalesMode, setTempSalesMode] = useState('cart');
  const [landingTags, setLandingTagsState] = useState(['فروش ویژه', 'جدید', 'پرفروش']);
  const [availableTagsForSelect, setAvailableTagsForSelect] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    password: '',
    permissions: [],
  });
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [editingBlogId, setEditingBlogId] = useState(null);
  const [blogForm, setBlogForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    image: '',
  });
  const [blogImageFile, setBlogImageFile] = useState(null);
  // ========== stateهای مربوط به درخواست‌های همکاری ==========
  const [partnersList, setPartnersList] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [partnersSortOrder, setPartnersSortOrder] = useState('desc');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showPartnerDetailModal, setShowPartnerDetailModal] = useState(false);
  const [partnerUploadedFiles, setPartnerUploadedFiles] = useState([]);
  const [partnerAdminNote, setPartnerAdminNote] = useState('');
  const [partnerUploading, setPartnerUploading] = useState(false);
  const [blogImagePreview, setBlogImagePreview] = useState('');
  const [bulkDiscountBar, setBulkDiscountBar] = useState({
    isOpen: false,
    discountType: 'percent',
    discountValue: '',
  });
  const [templates, setTemplates] = useState([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    size: '',
    glaze_type: '',
    title: '',
    description: '',
    usage_guide: '',
    maintenance: '',
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    type: 'customer',
  });

  const [experts, setExperts] = useState([]);
  const [expertForm, setExpertForm] = useState({ name: '', phone: '', photo: '', is_active: true });
  const [editingExpertId, setEditingExpertId] = useState(null);
  
  const [registrationStats, setRegistrationStats] = useState({
    today: { customers: 0, partners: 0 },
    week: { customers: 0, partners: 0 },
    month: { customers: 0, partners: 0 },
    daily: [],
  });
  const [quoteStats, setQuoteStats] = useState({
    total: 0,
    partnerCount: 0,
    customerCount: 0,
    finalizedCount: 0,
    totalValue: 0,
  });
  const [monthlyCustomerCount, setMonthlyCustomerCount] = useState(0);
  const [monthlyQuotesCount, setMonthlyQuotesCount] = useState(0);
  const [monthlyTotalAmount, setMonthlyTotalAmount] = useState(0);
  const [monthlyStatsLoading, setMonthlyStatsLoading] = useState(false);
  const [customersList, setCustomersList] = useState([]);

  // ========== Stateهای داشبورد پیشرفته ==========
  const [dashboardStats, setDashboardStats] = useState({
    todaySales: 0,
    monthSales: 0,
    yearSales: 0,
    newOrders: 0,
    pendingOrders: 0,
    overdueOrders: 0,
    totalCustomers: 0,
    uncontactedCustomers: 0,
    financialStatus: {
      totalIncome: 0,
      totalPending: 0,
      averageOrderValue: 0
    }
  });

  const [teamStatus, setTeamStatus] = useState({
    activeExperts: 0,
    totalExperts: 0,
    activeEmployees: 0,
    totalEmployees: 0
  });

  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const [openGroups, setOpenGroups] = useState({
  sales: true,        // فروش (باز باشد)
  products: true,     // مدیریت محصولات
  customers: false,   // مشتریان و پرسنل (بسته باشد)
  reports: false,     // گزارشات
  site: false,        // مدیریت سایت
});
  const toggleGroup = group => setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));

  // Helper: first day of month
  const getFirstDayOfMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };


  // دریافت لیست درخواست‌های همکاری
  const loadPartners = async () => {
    setLoadingPartners(true);
    try {
      const res = await fetch('/api/partners/pending');
      const data = await res.json();
      if (data.success) {
        let partnersListData = data.data;
        partnersListData.sort((a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return partnersSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
        setPartnersList(partnersListData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPartners(false);
    }
  };

  // Load stats from API
  const loadRegistrationStats = async () => {
    try {
      const res = await fetch('/api/stats/registrations');
      const result = await res.json();
      if (result.success) setRegistrationStats(result.data);
    } catch (error) {
      console.error('خطا در دریافت آمار ثبت‌نام:', error);
    }
  };

  const fetchCustomerQuotes = async (mobile) => {
    setLoadingQuotes(true);
    try {
      const res = await fetch(`/api/quotes`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const filtered = result.data.filter(quote => quote.customer_mobile === mobile);
        setCustomerQuotes(filtered);
      } else {
        setCustomerQuotes([]);
      }
    } catch (err) {
      console.error('خطا در دریافت سفارش‌ها:', err);
      setCustomerQuotes([]);
    } finally {
      setLoadingQuotes(false);
    }
  };
  const openCustomerDetailModal = (customer) => {
    setSelectedCustomerForDetail(customer);
    fetchCustomerQuotes(customer.mobile);
    setShowCustomerDetailModal(true);
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    uploadImagesToServer(files, e);
  };

  const uploadImagesToServer = async (files, inputEvent) => {
    setUploadingImages(true);
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      console.log('Upload result:', result);
      
      if (result.success && result.files) {
        // ذخیره مسیر صحیح
        const newImagePaths = result.files.map(file => {
          // فقط نام فایل را ذخیره کن
          return file.filename;
        });
        
        console.log('New image filenames:', newImagePaths);
        
        // گرفتن تصاویر فعلی
        let currentImages = [];
        if (form.images) {
          if (typeof form.images === 'string') {
            currentImages = form.images.split(',').map(s => s.trim()).filter(Boolean);
          } else if (Array.isArray(form.images)) {
            currentImages = form.images;
          }
        }
        
        const allImages = [...currentImages, ...newImagePaths];
        setForm({ ...form, images: allImages.join(', ') });
        
        // پیش‌نمایش با مسیر کامل
        const fullUrls = result.files.map(file => `/uploads/${file.filename}`);
        setImagePreviews(prev => [...prev, ...fullUrls]);
        
        alert(`${result.files.length} تصویر با موفقیت آپلود شد`);
      } else {
        alert('خطا در آپلود تصاویر');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('خطا در آپلود تصاویر: ' + error.message);
    } finally {
      setUploadingImages(false);
      if (inputEvent && inputEvent.target) inputEvent.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    const currentImages = form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : [];
    const updatedImages = currentImages.filter((_, idx) => idx !== indexToRemove);
    setForm({ ...form, images: updatedImages.join(', ') });
    
    const updatedPreviews = imagePreviews.filter((_, idx) => idx !== indexToRemove);
    setImagePreviews(updatedPreviews);
  };

  // تابع دریافت گزارش بر اساس بازه
  const loadReportData = async (period) => {
    setLoadingReport(true);
    try {
      let fromDate = '';
      let title = '';
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      if (period === 'today') {
        fromDate = todayStr;
        title = 'گزارش فروش امروز';
      } else if (period === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        fromDate = monthStart.toISOString().split('T')[0];
        title = 'گزارش فروش این ماه';
      } else if (period === 'year') {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        fromDate = yearStart.toISOString().split('T')[0];
        title = 'گزارش فروش سال جاری';
      }
      
      const res = await fetch(`/api/quotes?from_date=${fromDate}`);
      const data = await res.json();
      
      if (data.success && Array.isArray(data.data)) {
        const orders = data.data;
        const totalAmount = orders.reduce((sum, q) => sum + (q.total_amount || 0), 0);
        
        // دریافت اطلاعات مشتری برای هر سفارش
        const ordersWithCustomerInfo = await Promise.all(
          orders.map(async (order) => {
            let customerName = 'همکار';
            let customerCity = '—';
            
            if (order.partner_id) {
              try {
                const partnerRes = await fetch(`/api/partners/${order.partner_id}`);
                const partnerData = await partnerRes.json();
                if (partnerData.success) {
                  customerName = partnerData.data.company_name || partnerData.data.user_name || 'همکار';
                  customerCity = partnerData.data.city || '—';
                }
              } catch (err) {
                console.error('Error fetching partner:', err);
              }
            }
            
            return {
              id: order.id,
              quote_number: order.quote_number,
              customer_name: customerName,
              city: customerCity,
              total_amount: order.total_amount || 0,
              created_at: order.created_at,
              status: order.status
            };
          })
        );
        
        setReportData({
          totalAmount,
          totalOrders: orders.length,
          orders: ordersWithCustomerInfo
        });
        setReportTitle(title);
        setShowReportModal(true);
      } else {
        alert('خطا در دریافت اطلاعات گزارش');
      }
    } catch (err) {
      console.error('Error loading report:', err);
      alert('خطا در دریافت اطلاعات گزارش');
    } finally {
      setLoadingReport(false);
    }
  };

  const loadQuoteStats = async () => {
    try {
      const res = await fetch('/api/quotes');
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const quotes = result.data;
        let partnerCount = 0, customerCount = 0, finalizedCount = 0, totalValue = 0;
        for (const q of quotes) {
          if (q.partner_id && q.partner_id !== null) partnerCount++;
          else customerCount++;
          if (q.status === 'completed' || q.status === 'final_confirmed') {
            finalizedCount++;
            totalValue += (q.total_amount || 0);
          }
        }
        setQuoteStats({
          total: quotes.length,
          partnerCount,
          customerCount,
          finalizedCount,
          totalValue,
        });
      }
    } catch (error) {
      console.error('خطا در دریافت آمار پیش‌فاکتورها:', error);
    }
  };

  const loadMonthlyStats = async () => {
    setMonthlyStatsLoading(true);
    const fromDate = getFirstDayOfMonth();
    try {
      const customersRes = await fetch(`/api/users?type=customer&from_date=${fromDate}`);
      const customersData = await customersRes.json();
      if (Array.isArray(customersData)) {
        setMonthlyCustomerCount(customersData.length);
      } else if (customersData.data && Array.isArray(customersData.data)) {
        setMonthlyCustomerCount(customersData.data.length);
      } else {
        setMonthlyCustomerCount(0);
      }

      const quotesRes = await fetch(`/api/quotes?from_date=${fromDate}`);
      const quotesResult = await quotesRes.json();
      if (quotesResult.success && Array.isArray(quotesResult.data)) {
        let count = 0, total = 0;
        for (const q of quotesResult.data) {
          count++;
          total += (q.total_amount || 0);
        }
        setMonthlyQuotesCount(count);
        setMonthlyTotalAmount(total);
      }
    } catch (error) {
      console.error('خطا در دریافت آمار ماه جاری:', error);
    } finally {
      setMonthlyStatsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    refreshProducts();
    loadInitialTags();
    loadQuoteStats();
    loadMonthlyStats();
    loadRegistrationStats();
    loadAllQuotes(); // برای دریافت لیست سفارش‌ها

  }, []);

  useEffect(() => {
    if (showForm) {
      const loadTagsAndBrandsForForm = async () => {
        // بارگذاری تگ‌ها
        const tagsData = await getTags();
        setTags(Array.isArray(tagsData) ? tagsData : []);
        
        // بارگذاری برندها
        const brandsData = await getBrands();
        setBrands(Array.isArray(brandsData) ? brandsData : []);
      };
      loadTagsAndBrandsForForm();
    }
  }, [showForm]);

  // وقتی activeMenu تغییر می‌کند، URL را به‌روز کن
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeMenu && activeMenu !== 'dashboard') {
      params.set('section', activeMenu);
    }
    const newUrl = `${location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    navigate(newUrl, { replace: true });
  }, [activeMenu, navigate, location.pathname]);

  // وقتی activeMenu تغییر می‌کند، URL را به‌روز کن
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeMenu && activeMenu !== 'dashboard') {
      params.set('section', activeMenu);
    }
    const newUrl = `${location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    navigate(newUrl, { replace: true });
  }, [activeMenu, navigate, location.pathname]);

  useEffect(() => {
    if (activeMenu === 'partners') loadPartners();
    if (activeMenu === 'brands') loadBrandsData();
    if (activeMenu === 'tags') loadTagsData();
    if (activeMenu === 'employees') loadEmployeesData();
    if (activeMenu === 'blog') loadBlogPostsData();
    if (activeMenu === 'templates') loadTemplatesData();
    if (activeMenu === 'settings') loadSettingsData();
    if (activeMenu === 'customers') loadCustomersData();
    if (activeMenu === 'experts') loadExperts();
    if (activeMenu === 'manage-quotes') loadAllQuotes();
    if (activeMenu === 'price-requests') loadPriceRequests();
    if (activeMenu === 'dashboard') loadDashboardStats();
    if (activeMenu === 'dashboard') {loadChartData();}
  }, [activeMenu]);

  // وقتی صفحه لود میشه، اگه section تو URL نبود، برو به dashboard
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('section');
    if (!section) {
      navigate('/admin?section=dashboard', { replace: true });
      setActiveMenu('dashboard');
    }
  }, []);

  // وقتی صفحه لود میشه، از URL بخون که کدوم بخش فعال باشه
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const section = params.get('section');
  if (section === 'dashboard') {
    setActiveMenu('dashboard');
  }
}, [location.search]);

  const refreshProducts = async () => {
    const prods = await getProducts();
    setProducts(prods);
  };
  const loadPendingPartners = async () => {
    const partners = await getPendingPartners();
    console.log('پارتنرهای دریافت شده در ادمین:', partners);
    setPendingPartners(Array.isArray(partners) ? partners : []);
  };
  const loadBrandsData = async () => {
    const data = await getBrands();
    setBrands(Array.isArray(data) ? data : []);
  };
  const loadTagsData = async () => {
    const data = await getTags();
    setTags(Array.isArray(data) ? data : []);
  };
  const loadEmployeesData = async () => {
    const data = await getEmployees();
    setEmployees(Array.isArray(data) ? data : []);
  };
  const loadBlogPostsData = async () => {
    const data = await getBlogPosts();
    setBlogPosts(Array.isArray(data) ? data : []);
  };
  const loadTemplatesData = async () => {
    const data = await getProductTemplates();
    setTemplates(data);
  };
  const loadSettingsData = async () => {
    const s = await getSiteSettings();
    setSiteSettings(s);
    setTempSalesMode(s.salesMode);
    setLandingTagsState(s.landingTags || ['فروش ویژه', 'جدید', 'پرفروش']);
    const tagsData = await getTags();
    setAvailableTagsForSelect(tagsData.map(t => t.name));
  };
  
  const loadCustomersData = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        const errorText = await res.text();
        console.error('خطا در دریافت مشتریان:', errorText);
        setCustomersList([]);
        return;
      }
      const data = await res.json();
      let users = [];
      if (Array.isArray(data)) users = data;
      else if (data.data && Array.isArray(data.data)) users = data.data;
      else users = [];
      
      // ✅ فقط مشتری عادی و همکار (به جز ادمین)
      const customers = users.filter(user => user.type === 'customer' || user.type === 'partner');
      
      console.log('تعداد مشتریان و همکاران:', customers.length);
      setCustomersList(customers);
    } catch (error) {
      console.error('خطای شبکه:', error);
      setCustomersList([]);
    }
  };

  // ========== تابع بارگذاری درخواست‌های قیمت ==========
  const loadPriceRequests = async () => {
    setLoadingPriceRequests(true);
    try {
      const res = await fetch('/api/price-requests');
      const data = await res.json();
      if (data.success) setPriceRequests(data.data);
    } catch (err) { console.error(err); }
    finally { setLoadingPriceRequests(false); }
  };

  const loadExperts = async () => {
    try {
      const res = await fetch('/api/experts/all');
      const data = await res.json();
      if (data.success) setExperts(data.data);
    } catch (err) { console.error(err); }
  };



  // تابع دریافت داده‌های نمودار فروش
  const loadChartData = async () => {
    setLoadingChart(true);
    try {
      // دریافت داده‌های ۷ روز اخیر
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(dateStr);
      }
      
      const quotesRes = await fetch('/api/quotes');
      const quotesData = await quotesRes.json();
      
      if (quotesData.success && Array.isArray(quotesData.data)) {
        const quotes = quotesData.data;
        
        // داده‌های ۷ روز اخیر
        const dailySales = last7Days.map(date => {
          const dayQuotes = quotes.filter(q => q.created_at?.startsWith(date));
          const total = dayQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0);
          const persianDate = new Date(date).toLocaleDateString('fa-IR');
          return {
            date: persianDate,
            فروش: total,
            تعداد: dayQuotes.length
          };
        });
        setSalesChartData(dailySales);
        
        // داده‌های ۶ ماه اخیر
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStart = monthDate.toISOString().split('T')[0];
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split('T')[0];
          months.push({ start: monthStart, end: monthEnd, name: monthDate.toLocaleDateString('fa-IR', { month: 'long' }) });
        }
        
        const monthlySales = months.map(month => {
          const monthQuotes = quotes.filter(q => q.created_at >= month.start && q.created_at <= month.end);
          const total = monthQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0);
          return {
            month: month.name,
            فروش: total,
            تعداد: monthQuotes.length
          };
        });
        setMonthlySalesData(monthlySales);
      }
    } catch (err) {
      console.error('Error loading chart data:', err);
    } finally {
      setLoadingChart(false);
    }
  };


  // تابع دریافت سفارش‌ها با فیلتر وضعیت
  const loadOrderStatus = async () => {
    try {
      const res = await fetch('/api/quotes');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAllQuotes(data.data);
        setShowOrderStatusModal(true);
      } else {
        alert('خطا در دریافت سفارش‌ها');
      }
    } catch (err) {
      console.error('Error loading orders:', err);
      alert('خطا در دریافت سفارش‌ها');
    }
  };

  // مودال وضعیت سفارش‌ها
  const renderOrderStatusModal = () => {
    if (!showOrderStatusModal) return null;
    
    const filteredQuotes = orderStatusFilter === 'all' 
      ? allQuotes 
      : allQuotes.filter(q => q.status === orderStatusFilter);
    
    const getStatusLabel = (status) => {
      const map = {
        submitted: 'ثبت شده',
        reviewing: 'در حال بررسی',
        issued: 'صادر شده',
        preparing: 'در حال آماده‌سازی',
        completed: 'تکمیل شده',
        cancelled: 'لغو شده'
      };
      return map[status] || status;
    };
    
    const statusOptions = [
      { value: 'all', label: 'همه' },
      { value: 'submitted', label: 'ثبت شده' },
      { value: 'reviewing', label: 'در حال بررسی' },
      { value: 'issued', label: 'صادر شده' },
      { value: 'preparing', label: 'در حال آماده‌سازی' },
      { value: 'completed', label: 'تکمیل شده' },
      { value: 'cancelled', label: 'لغو شده' }
    ];
    
    return (
      <div className="modal-overlay" onClick={() => setShowOrderStatusModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
          background: 'white', 
          padding: 25, 
          borderRadius: 20, 
          maxWidth: 1000, 
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          margin: 'auto',
          marginTop: '5%'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 15 }}>
            <h3 style={{ margin: 0, color: '#13314c' }}>📋 وضعیت سفارش‌ها</h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold', color: '#13314c' }}>فیلتر وضعیت:</label>
              <select 
                value={orderStatusFilter} 
                onChange={e => setOrderStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc' }}
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button onClick={() => setShowOrderStatusModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>✖</button>
          </div>
          
          {filteredQuotes.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 40, color: '#7c8788' }}>هیچ سفارشی با این وضعیت یافت نشد.</p>
          ) : (
            <div className="table-container">
              <table className="products-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>شماره سفارش</th>
                    <th>تاریخ ثبت</th>
                    <th>مبلغ کل (تومان)</th>
                    <th>وضعیت</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map(quote => (
                    <tr key={quote.id}>
                      <td>{quote.quote_number}</td>
                      <td>{new Date(quote.created_at).toLocaleDateString('fa-IR')}</td>
                      <td style={{ fontWeight: 'bold', color: '#1c7385' }}>{quote.total_amount?.toLocaleString() || '۰'}</td>
                      <td>
                        <span className={`status-badge status-${quote.status}`}>
                          {getStatusLabel(quote.status)}
                        </span>
                      </td>
                      <td className="table-actions">
                        <button 
                          className="view-btn" 
                          onClick={() => {
                            setShowOrderStatusModal(false);
                            setActiveMenu('manage-quotes');
                          }}
                          style={{ background: '#1c7385', color: 'white', border: 'none', padding: '5px 12px', borderRadius: 6, cursor: 'pointer' }}
                        >
                          مدیریت
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn-secondary" onClick={() => setShowOrderStatusModal(false)} style={{ padding: '10px 25px' }}>
              بستن
            </button>
          </div>
        </div>
      </div>
    );
  };

  // مودال آمار مشتریان جدید
  // مودال آمار مشتریان جدید - اصلاح شده
  const renderCustomerStatsModal = () => {
    if (!showCustomerStatsModal) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setShowCustomerStatsModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
          background: 'white', 
          padding: 30, 
          borderRadius: 24, 
          maxWidth: 700, 
          width: '90%',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
            <h3 style={{ margin: 0, color: '#13314c', fontSize: 24 }}>📊 آمار کاربران جدید</h3>
            <button onClick={() => setShowCustomerStatsModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>✖</button>
          </div>
          
          {/* جمع کل */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: 20, 
            marginBottom: 30 
          }}>
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 20, borderRadius: 20, color: 'white' }}>
              <div>امروز</div>
              <div style={{ fontSize: 36, fontWeight: 'bold' }}>{customerStatsData.today}</div>
              <div style={{ fontSize: 12 }}>کل کاربران جدید</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: 20, borderRadius: 20, color: 'white' }}>
              <div>۷ روز گذشته</div>
              <div style={{ fontSize: 36, fontWeight: 'bold' }}>{customerStatsData.week}</div>
              <div style={{ fontSize: 12 }}>کل کاربران جدید</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', padding: 20, borderRadius: 20, color: 'white' }}>
              <div>ماه جاری</div>
              <div style={{ fontSize: 36, fontWeight: 'bold' }}>{customerStatsData.month}</div>
              <div style={{ fontSize: 12 }}>کل کاربران جدید</div>
            </div>
          </div>
          
          {/* جدول تفکیک */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
            <thead>
              <tr style={{ background: '#f0f4f7' }}>
                <th style={{ padding: '12px', textAlign: 'center' }}>بازه</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>👤 مشتری عادی</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>🤝 همکار</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>📊 جمع</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e3dede' }}>
                <td style={{ padding: '10px', textAlign: 'center' }}>امروز</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>{customerStatsData.regular?.today || 0}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>{customerStatsData.partner?.today || 0}</td>
                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{customerStatsData.today}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e3dede' }}>
                <td style={{ padding: '10px', textAlign: 'center' }}>۷ روز گذشته</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>{customerStatsData.regular?.week || 0}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>{customerStatsData.partner?.week || 0}</td>
                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{customerStatsData.week}</td>
              </tr>
              <tr>
                <td style={{ padding: '10px', textAlign: 'center' }}>ماه جاری</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>{customerStatsData.regular?.month || 0}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>{customerStatsData.partner?.month || 0}</td>
                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{customerStatsData.month}</td>
              </tr>
            </tbody>
          </table>
          
          <button className="btn-secondary" onClick={() => setShowCustomerStatsModal(false)} style={{ marginTop: 25, padding: '10px 30px', borderRadius: 30 }}>
            بستن
          </button>
        </div>
      </div>
    );
  };


  const loadAllData = async () => {
    setLoading(true);
    try {
      // بارگذاری نقش‌ها
      const rolesRes = await fetch('/api/employees/roles');
      const rolesData = await rolesRes.json();
      if (rolesData.success) setRoles(rolesData.data);

      // بارگذاری کارمندان (برای نمایش مدیران و سرپرستان)
      const employeesRes = await fetch('/api/employees');
      const employeesData = await employeesRes.json();
      if (employeesData.success) {
        const managersList = employeesData.data.filter(emp => emp.role_name === 'manager');
        setManagers(managersList);
        
        const supervisorsList = employeesData.data.filter(emp => emp.role_name === 'supervisor');
        setAvailableSupervisors(supervisorsList);
      }

      // بارگذاری تیم‌ها
      const teamsRes = await fetch('/api/employees/teams');
      const teamsData = await teamsRes.json();
      if (teamsData.success) setTeams(teamsData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ایجاد تیم جدید
  const createTeam = async () => {
    if (!teamForm.name) {
      alert('نام تیم الزامی است');
      return;
    }
    try {
      const res = await fetch('/api/employees/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamForm)
      });
      const data = await res.json();
      if (data.success) {
        alert('تیم با موفقیت ایجاد شد');
        setShowTeamModal(false);
        setTeamForm({ name: '', description: '', supervisor_id: '' });
        loadAllData();
      } else {
        alert('خطا: ' + data.error);
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور');
    }
  };

  // ایجاد کارمند جدید
  const createEmployee = async () => {
    if (!employeeForm.name || !employeeForm.mobile || !employeeForm.password || !employeeForm.role_id) {
      alert('نام، موبایل، رمز عبور و نقش الزامی است');
      return;
    }
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeForm)
      });
      const data = await res.json();
      if (data.success) {
        alert('کارمند با موفقیت ایجاد شد');
        setShowEmployeeModal(false);
        setEmployeeForm({ name: '', mobile: '', password: '', role_id: '', department: 'sales' });
        loadAllData();
      } else {
        alert('خطا: ' + data.error);
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور');
    }
  };

  // حذف تیم
  const deleteTeam = async (id) => {
    if (!window.confirm('آیا از حذف این تیم اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/employees/teams/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('تیم حذف شد');
        loadAllData();
      } else {
        alert('خطا: ' + data.error);
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور');
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const renderPermissions = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <div style={{ width: 40, height: 40, border: '4px solid #e3dede', borderTopColor: '#1c7385', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
          <p>در حال بارگذاری...</p>
        </div>
      );
    }

    return (
      <div className="permissions-view" style={{ padding: '20px' }}>
        {/* هدر */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 15 }}>
          <h2 style={{ color: '#13314c', margin: 0, fontSize: 28 }}>🔐 مدیریت کارمندان و تیم‌ها</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowEmployeeModal(true)} className="btn-primary" style={{ background: '#1c7385' }}>
              ➕ افزودن کارمند جدید
            </button>
            <button onClick={() => setShowTeamModal(true)} className="btn-primary" style={{ background: '#27ae60' }}>
              ➕ افزودن تیم جدید
            </button>
            <button onClick={loadAllData} className="btn-secondary">🔄 رفرش</button>
          </div>
        </div>

        {/* بخش نقش‌ها */}
        <div style={{ marginBottom: 40 }}>
          <h3 style={{ color: '#13314c', marginBottom: 20, paddingBottom: 10, borderBottom: '2px solid #ffd800', display: 'inline-block' }}>📋 نقش‌های سازمانی</h3>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 20 }}>
            {roles.map(role => (
              <div key={role.id} style={{ background: 'white', borderRadius: 20, padding: 20, width: 260, border: '1px solid #e3dede', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <h3 style={{ margin: 0, color: '#13314c', fontSize: 20 }}>
                    {role.name === 'admin' && '👑'} {role.name === 'manager' && '📊'} {role.name === 'supervisor' && '👥'} {role.name === 'expert' && '🔧'}
                    {' '}{role.name === 'admin' ? 'مدیر کل' : role.name === 'manager' ? 'مدیر' : role.name === 'supervisor' ? 'سرپرست' : 'کارشناس'}
                  </h3>
                  {role.name === 'admin' && <span style={{ background: '#ffd800', color: '#13314c', padding: '4px 12px', borderRadius: 30, fontSize: 11, fontWeight: 'bold' }}>دسترسی کامل</span>}
                </div>
                <div style={{ fontSize: 13, color: '#5a6874' }}>
                  <strong>دسترسی‌ها:</strong>
                  <ul style={{ marginTop: 10, paddingRight: 20, maxHeight: 120, overflowY: 'auto' }}>
                    {(role.permissions || []).slice(0, 4).map(perm => (
                      <li key={perm} style={{ marginBottom: 3, fontSize: 12 }}>✓ {perm}</li>
                    ))}
                    {(role.permissions || []).length > 4 && <li>+ {(role.permissions || []).length - 4} مورد دیگر</li>}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* بخش مدیران */}
        <div style={{ marginBottom: 40 }}>
          <h3 style={{ color: '#13314c', marginBottom: 20, paddingBottom: 10, borderBottom: '2px solid #ffd800', display: 'inline-block' }}>👨‍💼 مدیران</h3>
          {managers.length === 0 ? (
            <p style={{ color: '#7c8788', marginTop: 20 }}>هیچ مدیری ثبت نشده است.</p>
          ) : (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 20 }}>
              {managers.map(manager => (
                <div key={manager.id} style={{ background: '#f0f4f7', borderRadius: 16, padding: 15, width: 220, border: '1px solid #e3dede' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
                  <h4 style={{ margin: 0, color: '#13314c' }}>{manager.name}</h4>
                  <p style={{ fontSize: 12, color: '#7c8788', marginTop: 5 }}>{manager.mobile}</p>
                  <p style={{ fontSize: 12, color: '#1c7385', marginTop: 5 }}>{manager.department === 'sales' ? 'فروش' : manager.department === 'executive' ? 'اجرایی' : manager.department}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* بخش تیم‌ها */}
        <div>
          <h3 style={{ color: '#13314c', marginBottom: 20, paddingBottom: 10, borderBottom: '2px solid #ffd800', display: 'inline-block' }}>👥 تیم‌ها</h3>
          {teams.length === 0 ? (
            <p style={{ color: '#7c8788', marginTop: 20 }}>هیچ تیمی ثبت نشده است.</p>
          ) : (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 20 }}>
              {teams.map(team => (
                <div key={team.id} style={{ background: 'white', borderRadius: 16, padding: 15, width: 260, border: '1px solid #e3dede', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h4 style={{ margin: 0, color: '#13314c' }}>{team.name}</h4>
                    <button onClick={() => deleteTeam(team.id)} style={{ background: 'none', border: 'none', color: '#a70023', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                  </div>
                  {team.description && <p style={{ fontSize: 12, color: '#5a6874', marginBottom: 8 }}>{team.description}</p>}
                  <p style={{ fontSize: 12, color: '#1c7385' }}><strong>سرپرست:</strong> {team.supervisor_name || 'تعیین نشده'}</p>
                  <p style={{ fontSize: 12, color: '#7c8788' }}><strong>تعداد اعضا:</strong> {team.member_count || 0}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* مودال افزودن تیم */}
        {showTeamModal && (
          <div className="modal-overlay" onClick={() => setShowTeamModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <div className="modal-header">
                <h3>➕ افزودن تیم جدید</h3>
                <button className="modal-close" onClick={() => setShowTeamModal(false)}>✖</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>نام تیم *</label>
                  <input type="text" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="مثال: تیم فروش شمال" />
                </div>
                <div className="form-group">
                  <label>توضیحات</label>
                  <textarea rows="2" value={teamForm.description} onChange={e => setTeamForm({ ...teamForm, description: e.target.value })} placeholder="توضیحات اختیاری" />
                </div>
                <div className="form-group">
                  <label>سرپرست تیم</label>
                  <select value={teamForm.supervisor_id} onChange={e => setTeamForm({ ...teamForm, supervisor_id: e.target.value })}>
                    <option value="">انتخاب سرپرست...</option>
                    {availableSupervisors.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name} ({sup.mobile})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowTeamModal(false)}>انصراف</button>
                <button className="btn-primary" onClick={createTeam}>ایجاد تیم</button>
              </div>
            </div>
          </div>
        )}

        {/* مودال افزودن کارمند */}
        {showEmployeeModal && (
          <div className="modal-overlay" onClick={() => setShowEmployeeModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
              <div className="modal-header">
                <h3>➕ افزودن کارمند جدید</h3>
                <button className="modal-close" onClick={() => setShowEmployeeModal(false)}>✖</button>
              </div>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>نام کامل *</label>
                    <input type="text" value={employeeForm.name} onChange={e => setEmployeeForm({ ...employeeForm, name: e.target.value })} placeholder="نام و نام خانوادگی" />
                  </div>
                  <div className="form-group">
                    <label>شماره موبایل *</label>
                    <input type="tel" value={employeeForm.mobile} onChange={e => setEmployeeForm({ ...employeeForm, mobile: e.target.value })} placeholder="09123456789" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>رمز عبور *</label>
                    <input type="password" value={employeeForm.password} onChange={e => setEmployeeForm({ ...employeeForm, password: e.target.value })} placeholder="********" />
                  </div>
                  <div className="form-group">
                    <label>نقش *</label>
                    <select value={employeeForm.role_id} onChange={e => setEmployeeForm({ ...employeeForm, role_id: e.target.value })}>
                      <option value="">انتخاب نقش...</option>
                      {roles.filter(r => r.name !== 'admin').map(role => (
                        <option key={role.id} value={role.id}>{role.name === 'manager' ? 'مدیر' : role.name === 'supervisor' ? 'سرپرست' : 'کارشناس'}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>دپارتمان</label>
                  <select value={employeeForm.department} onChange={e => setEmployeeForm({ ...employeeForm, department: e.target.value })}>
                    <option value="sales">فروش</option>
                    <option value="executive">اجرایی</option>
                    <option value="financial">مالی</option>
                    <option value="technical">فنی</option>
                    <option value="support">پشتیبانی</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowEmployeeModal(false)}>انصراف</button>
                <button className="btn-primary" onClick={createEmployee}>ایجاد کارمند</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // تابع دریافت آمار مشتریان جدید
  // تابع دریافت آمار مشتریان جدید - اصلاح شده
  // تابع دریافت آمار مشتریان جدید (مشتری عادی + همکار)
  const loadCustomerStats = async () => {
    try {
      // دریافت تاریخ امروز
      const today = new Date().toISOString().split('T')[0];
      
      // دریافت تاریخ 7 روز پیش
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekStart = weekAgo.toISOString().split('T')[0];
      
      // دریافت تاریخ اول ماه جاری
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      
      // دریافت لیست همه کاربران
      const res = await fetch('/api/users');
      const data = await res.json();
      
      let users = [];
      if (Array.isArray(data)) users = data;
      else if (data.data && Array.isArray(data.data)) users = data.data;
      else users = [];
      
      // ✅ فیلتر کردن مشتریان عادی و همکاران (به جز ادمین)
      const customers = users.filter(u => u.type === 'customer' || u.type === 'partner');
      
      // محاسبه آمار بر اساس تاریخ
      const todayCustomers = customers.filter(c => {
        const createdDate = new Date(c.created_at).toISOString().split('T')[0];
        return createdDate === today;
      });
      
      const weekCustomers = customers.filter(c => {
        const createdDate = new Date(c.created_at).toISOString().split('T')[0];
        return createdDate >= weekStart;
      });
      
      const monthCustomers = customers.filter(c => {
        const createdDate = new Date(c.created_at).toISOString().split('T')[0];
        return createdDate >= monthStart;
      });
      
      setCustomerStatsData({
        today: todayCustomers.length,
        week: weekCustomers.length,
        month: monthCustomers.length
      });
      
      setShowCustomerStatsModal(true);
    } catch (err) {
      console.error('Error loading customer stats:', err);
      alert('خطا در دریافت آمار مشتریان');
    }
  };

  const loadInitialTags = async () => {
    const tagsData = await getTags();
    setTags(Array.isArray(tagsData) ? tagsData : []);
  };
  const translateQuoteStatus = (status) => {
    const map = {
      submitted: 'ثبت شده',
      reviewing: 'در حال بررسی',
      issued: 'صادر شده',
      preparing: 'در حال آماده‌سازی',
      completed: 'تکمیل شده',
      cancelled: 'لغو شده'
    };
    return map[status] || status;
  };

  /////////////////////////////////////
  const loadDashboardStats = async () => {
    setLoadingDashboard(true);
    try {
      // ۱. آمار فروش و سفارشات
      const quotesRes = await fetch('/api/quotes');
      const quotesData = await quotesRes.json();
      
      if (quotesData.success && Array.isArray(quotesData.data)) {
        const quotes = quotesData.data;
        const today = new Date().toISOString().split('T')[0];
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

        const todayQuotes = quotes.filter(q => q.created_at?.startsWith(today));
        const monthQuotes = quotes.filter(q => q.created_at >= monthStart);
        const yearQuotes = quotes.filter(q => q.created_at >= yearStart);
        const pendingQuotes = quotes.filter(q => q.status === 'submitted' || q.status === 'reviewing');
        const overdueQuotes = quotes.filter(q => q.status === 'waiting_customer');

        // محاسبه مبالغ
        const todaySales = todayQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0);
        const monthSales = monthQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0);
        const yearSales = yearQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0);

        // ۲. آمار مشتریان
        const usersRes = await fetch('/api/users');
        const usersData = await usersRes.json();
        const allUsers = Array.isArray(usersData) ? usersData : (usersData.data || []);
        const customers = allUsers.filter(u => u.type === 'customer');

        // ۳. آمار کارشناسان و کارمندان
        const expertsRes = await fetch('/api/experts/all');
        const expertsData = await expertsRes.json();
        const allExperts = expertsData.success ? expertsData.data : [];
        const activeExperts = allExperts.filter(e => e.is_active).length;

        const allEmployees = employees.length > 0 ? employees : [];
        const activeEmployees = allEmployees.filter(e => e.is_active !== false).length;

        setDashboardStats({
          todaySales,
          monthSales,
          yearSales,
          newOrders: todayQuotes.length,
          pendingOrders: pendingQuotes.length,
          overdueOrders: overdueQuotes.length,
          totalCustomers: customers.length,
          uncontactedCustomers: 0,
          financialStatus: {
            totalIncome: monthSales,
            totalPending: pendingQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0),
            averageOrderValue: quotes.length > 0 ? Math.round(yearSales / quotes.length) : 0
          }
        });

        setTeamStatus({
          activeExperts,
          totalExperts: allExperts.length,
          activeEmployees,
          totalEmployees: allEmployees.length
        });
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };
  ///////////////////////////////////////

  const loadAllQuotes = async () => {
    setLoadingAllQuotes(true);
    try {
      let url = '/api/quotes';
      if (quoteStatusFilter) url += `?status=${quoteStatusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      
      console.log('Quotes API response:', data); // برای دیباگ
      
      // بررسی ساختار پاسخ
      if (data.success && Array.isArray(data.data)) {
        setAllQuotes(data.data);
      } else if (Array.isArray(data)) {
        setAllQuotes(data);
      } else {
        console.error('Unexpected response format:', data);
        setAllQuotes([]);
      }
    } catch (err) { 
      console.error('Error loading quotes:', err);
      setAllQuotes([]);
    } finally { 
      setLoadingAllQuotes(false); 
    }
  };

  const handleChangeQuoteStatus = async (quoteId, newStatus) => {
    if (!window.confirm(`آیا وضعیت به "${newStatus}" تغییر کند؟`)) return;
    try {
      const res = await fetch(`/api/quotes/${quoteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        alert('وضعیت با موفقیت تغییر کرد');
        loadAllQuotes();
      } else {
        alert('خطا: ' + data.error);
      }
    } catch (err) { console.error(err); }
  };

  // Products stats & filtering
  const stats = useMemo(() => {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    const discounted = products.filter(p => p.discount > 0).length;
    return { total: products.length, categories: categories.length, discounted };
  }, [products]);
  const allCategories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))], [products]);
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = searchTerm
        ? p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.category && p.category.includes(searchTerm))
        : true;
      const matchesCategory = filterCategory ? p.category === filterCategory : true;
      const matchesDiscount = discountOnly ? p.discount > 0 : true;
      return matchesSearch && matchesCategory && matchesDiscount;
    });
  }, [products, searchTerm, filterCategory, discountOnly]);

  const handleTotalProductsClick = () => {
    setDiscountOnly(false);
    setFilterCategory('');
    setSearchTerm('');
    setActiveMenu('products');
  };
  const handleCategoriesClick = () => {
    setDiscountOnly(false);
    setFilterCategory('');
    setSearchTerm('');
    setActiveMenu('products');
    setTimeout(() => {
      if (categorySelectRef.current) {
        categorySelectRef.current.focus();
        categorySelectRef.current.click();
      }
    }, 100);
  };
  const handleDiscountedClick = () => {
    setDiscountOnly(true);
    setFilterCategory('');
    setSearchTerm('');
    setActiveMenu('products');
  };

  const handleTagToggle = (tag) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
    }));
  };

  // Product CRUD
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // اعتبارسنجی اولیه - فقط نام اجباری هست
    if (form.name.trim() === '') {
      alert('نام محصول الزامی است');
      return;
    }
    
    // قیمت - اگه خالی بود 0 بزار
    let productPrice = 0;
    if (form.price && form.price !== '' && !isNaN(Number(form.price))) {
      productPrice = Number(form.price);
    }
    
    let partnerPrice = 0;
    if (form.partnerPrice && form.partnerPrice !== '' && !isNaN(Number(form.partnerPrice))) {
      partnerPrice = Number(form.partnerPrice);
    }
    
    // اگر قیمت همکار خالی بود، از قیمت اصلی استفاده کن
    if (partnerPrice === 0 && productPrice > 0) {
      partnerPrice = productPrice;
    }
    
    // اگر کد محصول خالی بود، خودکار تولید کن
    let productCode = form.productCode;
    if (!productCode || productCode.trim() === '') {
      productCode = `PRD-${Date.now()}`;
    }
    
    // پردازش تصاویر
    let imageArray = [];
    if (form.images) {
      if (typeof form.images === 'string') {
        imageArray = form.images.split(',').map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(form.images)) {
        imageArray = form.images;
      }
    }
    
    // ساخت دیتای محصول
    const productData = {
      productcode: productCode,
      grade: form.grade || '',
      name: form.name,
      price: productPrice,
      partnerprice: partnerPrice,
      discount: Number(form.discount) || 0,
      stock: Number(form.stock) || 0,
      description: form.description || '',
      manufacturer: form.manufacturer || '',
      glazetype: form.glazeType || '',
      suitablefor: form.suitableFor || '',
      category: form.category || '',
      size: form.size || '',
      glaze: form.glaze || '',
      color: form.color || '',
      images: JSON.stringify(imageArray),
      fulldescription: form.fullDescription || '',
      tags: JSON.stringify(form.tags || []),
      audience: form.audience || 'all'
    };
  
  // ... ادامه کد (بررسی تکراری بودن و ذخیره)
    console.log('📦 Product data being sent:', productData);
    
    // بررسی وجود محصول تکراری (فقط اگه کد محصول خالی نباشه)
    const existingProduct = products.find(p => p.productCode === productCode);
    
    if (existingProduct && !editingId) {
      const shouldUpdate = window.confirm(
        `محصولی با کد "${productCode}" از قبل وجود دارد (${existingProduct.name}).\n` +
        `آیا می‌خواهید قیمت و موجودی آن را با مقادیر جدید به‌روز کنید؟`
      );
      if (shouldUpdate) {
        await updateProduct(existingProduct.id, {
          price: productData.price,
          partnerPrice: productData.partnerprice,
          stock: productData.stock,
        });
        await refreshProducts();
      } else {
        alert('محصول ثبت نشد. لطفاً از کد محصول دیگری استفاده کنید.');
        return;
      }
      closeForm();
      return;
    }
    
    // اطمینان از وجود برند و تگ‌ها
    if (form.manufacturer) {
      await ensureBrandExists(form.manufacturer);
      await loadBrandsData();
    }
    for (const tag of form.tags) {
      await ensureTagExists(tag);
    }
    await loadTagsData();
    
    // ذخیره محصول
    try {
      if (editingId) {
        await updateProduct(editingId, productData);
        alert('محصول با موفقیت ویرایش شد');
      } else {
        await addProduct(productData);
        alert('محصول با موفقیت اضافه شد');
      }
      await refreshProducts();
      closeForm();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('خطا در ذخیره محصول: ' + error.message);
    }
  };

  const closeForm = () => {
    setForm({
      productCode: '',
      grade: '',
      name: '',
      price: '',
      partnerPrice: '',
      discount: '',
      stock: '',
      description: '',
      manufacturer: '',
      glazeType: '',
      glaze: '',
      suitableFor: '',
      category: '',
      size: '',
      color: '',
      images: '',
      fullDescription: '',
      tags: [],
      audience: 'all',
    });
    setImagePreviews([]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setForm({
      productCode: product.productCode || '',
      grade: product.grade || '',
      name: product.name || '',
      price: product.price || '',
      partnerPrice: product.partnerPrice !== undefined ? product.partnerPrice : product.price || '',
      discount: product.discount || '',
      stock: product.stock || '',
      description: product.description || '',
      manufacturer: product.manufacturer || '',
      glazeType: product.glazeType || '',
      glaze: product.glaze || '',
      suitableFor: product.suitableFor || '',
      category: product.category || '',
      size: product.size || '',
      color: product.color || '',
      images: product.images ? product.images.join(', ') : '',
      fullDescription: product.fullDescription || '',
      tags: product.tags || [],
      audience: product.audience || 'all',
    });
    if (product.images && product.images.length) {
      const existingPreviews = product.images.map(img => 
        img.startsWith('http') ? img : `${img}`
      );
      setImagePreviews(existingPreviews);
    } else {
      setImagePreviews([]);
    }
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('آیا از حذف این محصول اطمینان دارید؟')) {
      await deleteProduct(id);
      await refreshProducts();
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`${selectedIds.length} محصول حذف شوند؟`)) {
      for (const id of selectedIds) {
        await deleteProduct(id);
      }
      await refreshProducts();
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const handleLogout = () => {
    // همه اطلاعات کاربری رو پاک کن
    localStorage.removeItem('aseman_admin_auth');
    localStorage.removeItem('aseman_customer_auth');
    localStorage.removeItem('aseman_employee_auth');
    localStorage.removeItem('aseman_auth_token');
    
    // هر چیز دیگه‌ای که ذخیره شده
    sessionStorage.clear();
    
    navigate('/login');
  };
  const handleReset = async () => {
    if (window.confirm('آیا از بازنشانی به داده‌های پیش‌فرض اطمینان دارید؟')) {
      await resetToDefault();
      await refreshProducts();
      alert('داده‌ها به حالت اولیه بازگشتند.');
      setFilterCategory('');
      setSearchTerm('');
      setDiscountOnly(false);
    }
  };
  // Import/Export (simplified but functional)
  const handleFileSelect = (e) => setSelectedFile(e.target.files[0]);
  const showDuplicateDialog = (productName) => {
    return new Promise(resolve => {
      setDuplicateModal({
        isOpen: true,
        productName,
        onResolve: choice => {
          setDuplicateModal({ isOpen: false, productName: '', onResolve: null });
          resolve(choice);
        },
      });
    });
  };
  const handleImport = async () => {
    if (!selectedFile) {
      alert('لطفاً یک فایل انتخاب کنید.');
      return;
    }
    if (ioFormat === 'excel' && !window.XLSX) {
      alert('کتابخانه Excel بارگذاری نشده است.');
      return;
    }
    try {
      if (ioFormat === 'json') {
        const text = await selectedFile.text();
        const result = await importData(text);
        if (result.success) alert('وارد کردن با موفقیت انجام شد.');
        else throw new Error(result.error);
      } else if (ioFormat === 'csv') {
        const importedProducts = await importProductsFromCSV(selectedFile);
        let added = 0, updated = 0;
        for (const p of importedProducts) {
          const existing = products.find(prod => prod.productCode === p.productCode);
          if (existing) {
            await updateProduct(existing.id, { price: p.price, partnerPrice: p.partnerPrice, stock: p.stock });
            updated++;
          } else {
            await addProduct(p);
            added++;
          }
        }
        alert(`✅ ${added} محصول جدید اضافه شد، ${updated} محصول به‌روزرسانی شد.`);
      } else if (ioFormat === 'excel') {
        const result = await importProductsFromExcel(selectedFile);
        if (result.errors?.length) alert(`⚠️ ${result.errors.length} خطا در وارد کردن وجود دارد.`);
        if (result.added?.length) alert(`✅ ${result.added.length} محصول جدید اضافه شد.`);
        if (result.updated?.length) alert(`🔄 ${result.updated.length} محصول به‌روزرسانی شد.`);
      }
      await refreshProducts();
    } catch (error) {
      alert('خطا در وارد کردن فایل: ' + error.message);
    } finally {
      setSelectedFile(null);
      document.getElementById('file-input').value = '';
    }
  };
  const handleExport = async () => {
    const data = await exportData();
    const productsArray = JSON.parse(data);
    let blob, filename;
    if (ioFormat === 'json') {
      blob = new Blob([data], { type: 'application/json' });
      filename = `products_backup_${new Date().toISOString().slice(0, 10)}.json`;
    } else if (ioFormat === 'csv') {
      const headers = [
        'کد محصول', 'درجه', 'نام', 'قیمت', 'قیمت همکار', 'تخفیف', 'موجودی',
        'دسته‌بندی', 'شرکت سازنده', 'نوع خاک', 'نوع لعاب', 'مناسب برای', 'سایز', 'رنگ',
        'تصاویر', 'توضیحات', 'توضیحات کامل', 'تگ‌ها', 'مخاطب'
      ];
      const rows = productsArray.map(p => [
        p.productCode || '', p.grade || '', p.name, p.price, p.partnerPrice, p.discount, p.stock,
        p.category || '', p.manufacturer || '', p.glazeType || '', p.glaze || '', p.suitableFor || '',
        p.size || '', p.color || '', (p.images || []).join(';'), p.description || '',
        p.fullDescription || '', (p.tags || []).join(';'), p.audience || 'all'
      ]);
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      filename = `products_export_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (ioFormat === 'excel') {
      if (!window.XLSX) {
        alert('کتابخانه Excel بارگذاری نشده است.');
        return;
      }
      const headers = [
        'کد محصول', 'درجه', 'نام', 'قیمت', 'قیمت همکار', 'تخفیف', 'موجودی',
        'دسته‌بندی', 'شرکت سازنده', 'نوع خاک', 'نوع لعاب', 'مناسب برای', 'سایز', 'رنگ',
        'تصاویر', 'توضیحات', 'توضیحات کامل', 'تگ‌ها', 'مخاطب'
      ];
      const rows = productsArray.map(p => [
        p.productCode || '', p.grade || '', p.name, p.price, p.partnerPrice, p.discount, p.stock,
        p.category || '', p.manufacturer || '', p.glazeType || '', p.glaze || '', p.suitableFor || '',
        p.size || '', p.color || '', (p.images || []).join(';'), p.description || '',
        p.fullDescription || '', (p.tags || []).join(';'), p.audience || 'all'
      ]);
      const wb = window.XLSX.utils.book_new();
      const ws = window.XLSX.utils.aoa_to_sheet([headers, ...rows]);
      window.XLSX.utils.book_append_sheet(wb, ws, 'محصولات');
      window.XLSX.writeFile(wb, `products_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  const downloadTemplate = () => {
    if (ioFormat === 'json') {
      const template = [{ productCode: 'PRD-001', grade: 'A', name: 'کاشی نمونه', price: 100000, partnerPrice: 85000, discount: 0, stock: 100, category: 'کف', manufacturer: 'حافظ', glazeType: 'خاک سفید', glaze: 'براق', suitableFor: 'سالن', size: '60*60', color: 'سفید', images: ['/images/sample1.jpg'], description: 'توضیح کوتاه', fullDescription: '<p>توضیح بلند</p>', tags: ['جدید'], audience: 'all' }];
      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template.json';
      a.click();
      URL.revokeObjectURL(url);
    } else if (ioFormat === 'csv') {
      const headers = ['کد محصول', 'درجه', 'نام', 'قیمت', 'قیمت همکار', 'تخفیف', 'موجودی', 'دسته‌بندی', 'شرکت سازنده', 'نوع خاک', 'نوع لعاب', 'مناسب برای', 'سایز', 'رنگ', 'تصاویر', 'توضیحات', 'توضیحات کامل', 'تگ‌ها', 'مخاطب'];
      const sampleRow = ['PRD-001', 'A', 'کاشی نمونه', '100000', '85000', '0', '100', 'کف', 'حافظ', 'خاک سفید', 'براق', 'سالن', '60*60', 'سفید', '/images/sample1.jpg', 'توضیح کوتاه', '<p>توضیح بلند</p>', 'جدید', 'all'];
      const csvContent = headers.join(',') + '\n' + sampleRow.join(',');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else if (ioFormat === 'excel') {
      if (!window.XLSX) return alert('کتابخانه Excel بارگذاری نشده است.');
      const headers = ['کد محصول', 'درجه', 'نام', 'قیمت', 'قیمت همکار', 'تخفیف', 'موجودی', 'دسته‌بندی', 'شرکت سازنده', 'نوع خاک', 'نوع لعاب', 'مناسب برای', 'سایز', 'رنگ', 'تصاویر', 'توضیحات', 'توضیحات کامل', 'تگ‌ها', 'مخاطب'];
      const sampleRow = ['PRD-001', 'A', 'کاشی نمونه', '100000', '85000', '0', '100', 'کف', 'حافظ', 'خاک سفید', 'براق', 'سالن', '60*60', 'سفید', '/images/sample1.jpg', 'توضیح کوتاه', '<p>توضیح بلند</p>', 'جدید', 'all'];
      const wb = window.XLSX.utils.book_new();
      const ws = window.XLSX.utils.aoa_to_sheet([headers, sampleRow]);
      window.XLSX.utils.book_append_sheet(wb, ws, 'محصولات');
      window.XLSX.writeFile(wb, 'template.xlsx');
    }
  };

  // ==================== Brand Management with extra fields ====================
  const handleBrandFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setBrandForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  // آپلود لوگو کارخانه
  const handleBrandLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // بررسی نوع فایل
    if (!file.type.startsWith('image/')) {
      alert('لطفاً فقط فایل تصویری انتخاب کنید');
      return;
    }
    
    // بررسی حجم (حداکثر 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('حجم فایل باید کمتر از 2 مگابایت باشد');
      return;
    }
    
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.success && data.files && data.files.length > 0) {
        const logoPath = `/uploads/${data.files[0].filename}`;
        setBrandFormData({ ...brandFormData, logo: logoPath });
        setBrandLogoPreview(`${logoPath}`);
        alert('لوگو با موفقیت آپلود شد');
      } else {
        alert('خطا در آپلود لوگو');
      }
    } catch (err) {
      console.error(err);
      alert('خطا در آپلود لوگو');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAddBrand = async () => {
    if (!brandForm.name.trim()) {
      alert('نام برند الزامی است');
      return;
    }
    const result = await addBrand(brandForm);
    if (result.success) {
      setBrands(result.brands);
      setBrandForm({ name: '', logo: '', address: '', description: '', website: '', phone: '', email: '', enabled: true });
    } else {
      alert(result.error);
    }
  };

  const handleUpdateBrand = async () => {
    if (!editingBrand) return;
    const result = await updateBrand(editingBrand, brandForm);
    if (result.success) {
      setBrands(result.brands);
      setEditingBrand(null);
      setBrandForm({ name: '', logo: '', address: '', description: '', website: '', phone: '', email: '', enabled: true });
    } else {
      alert(result.error);
    }
  };
  const handleDeleteBrand = async (id) => {
    if (window.confirm('حذف این برند؟')) {
      const result = await deleteBrand(id);
      if (result.success) {
        setBrands(result.brands);
      } else {
        alert(result.error);
      }
    }
  };


  const handleBrandSubmit = async () => {
    if (!brandFormData.name.trim()) {
      alert('نام کارخانه الزامی است');
      return;
    }

    try {
      let url = '/api/brands';
      let method = 'POST';
      
      if (editingBrandId) {
        url = `/api/brands/${editingBrandId}`;
        method = 'PUT';
      }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: brandFormData.name,
          logo: brandFormData.logo || null,
          address: brandFormData.address || null,
          description: brandFormData.description || null,
          website: brandFormData.website || null,
          phone: brandFormData.phone || null,
          email: brandFormData.email || null,
          enabled: brandFormData.enabled ? 1 : 0
        })
      });
      
      const data = await res.json();
      
      if (data.success || data.id) {
        alert(editingBrandId ? 'کارخانه با موفقیت ویرایش شد' : 'کارخانه با موفقیت اضافه شد');
        setShowBrandForm(false);
        setEditingBrandId(null);
        setBrandFormData({ name: '', logo: '', address: '', description: '', website: '', phone: '', email: '', enabled: true });
        setBrandLogoPreview('');
        loadBrandsData();
      } else {
        alert('خطا: ' + (data.error || 'مشخص نشده'));
      }
    } catch (err) {
      console.error(err);
      alert('خطا در ارتباط با سرور');
    }
  };

  const handleToggleBrand = async (id, enabled) => {
    const result = await toggleBrandEnabled(id, enabled);
    if (result.success) setBrands(result.brands);
  };

  const startEditBrand = (brand) => {
    console.log('Editing brand:', brand); // برای دیباگ
    setEditingBrandId(brand.id);
    setBrandFormData({
      name: brand.name || '',
      logo: brand.logo || '',
      address: brand.address || '',
      description: brand.description || '',
      website: brand.website || '',
      phone: brand.phone || '',
      email: brand.email || '',
      enabled: brand.enabled === 1
    });
    if (brand.logo) {
      setBrandLogoPreview(brand.logo.startsWith('http') ? brand.logo : `${brand.logo}`);
    } else {
      setBrandLogoPreview('');
    }
    setShowBrandForm(true);
  };

  const cancelEditBrand = () => {
    setEditingBrand(null);
    setBrandForm({ name: '', logo: '', address: '', description: '', website: '', phone: '', email: '', enabled: true });
  };

  // Tag management (unchanged)
  const handleAddTag = async () => {
    const result = await addTag(tagForm);
    if (result.success) { setTags(result.tags); setTagForm(''); }
    else alert(result.error);
  };
  const handleUpdateTag = async () => {
    if (!editingTag) return;
    const result = await updateTag(editingTag, tagForm);
    if (result.success) { setTags(result.tags); setTagForm(''); setEditingTag(null); }
    else alert(result.error);
  };
  const handleDeleteTag = async (name) => {
    if (window.confirm(`تگ "${name}" حذف شود؟`)) {
      const result = await deleteTag(name);
      setTags(result.tags);
    }
  };
  const handleToggleTag = async (tagName, enabled) => {
    const result = await toggleTagEnabled(tagName, enabled);
    if (result.success) setTags(result.tags);
  };
  const startEditTag = (name) => { setEditingTag(name); setTagForm(name); };
  const cancelEditTag = () => { setEditingTag(null); setTagForm(''); };

  // Partners
  const handleApprovePartner = (id) => {
    if (window.confirm('تأیید شود؟')) { approvePartner(id); loadPendingPartners(); }
  };
  const handleRejectPartner = (id) => {
    if (window.confirm('رد شود؟')) { rejectPartner(id); loadPendingPartners(); }
  };

  // Settings
  const handleTempSalesModeChange = (e) => setTempSalesMode(e.target.value);
  const handleSaveSettings = async () => {
    const success = await setSalesMode(tempSalesMode);
    if (success) { setSiteSettings({ salesMode: tempSalesMode }); alert('تنظیمات ذخیره شد.'); }
    else alert('خطا در ذخیره تنظیمات.');
  };
  const handleSaveLandingTags = async () => {
    const success = await setLandingTags(landingTags);
    if (success) alert('تگ‌های صفحه اصلی ذخیره شد.');
    else alert('خطا در ذخیره تگ‌ها.');
  };

  // Employees (simplified, keep existing functions)
  const handleEmployeeSubmit = async () => {
    if (!employeeForm.name || !employeeForm.email || !employeeForm.password) {
      alert('نام، ایمیل و رمز عبور الزامی هستند.');
      return;
    }
    if (editingEmployee) {
      const result = await updateEmployee(editingEmployee.id, employeeForm);
      if (result.success) {
        await loadEmployeesData();
        setShowEmployeeForm(false);
        setEditingEmployee(null);
        setEmployeeForm({ name: '', email: '', password: '', permissions: [] });
        alert('کارمند ویرایش شد.');
      } else alert(result.error);
    } else {
      const result = await createEmployee(employeeForm);
      if (result.success) {
        await loadEmployeesData();
        setShowEmployeeForm(false);
        setEmployeeForm({ name: '', email: '', password: '', permissions: [] });
        alert('کارمند ایجاد شد.');
      } else alert(result.error);
    }
  };
  const handleEditEmployee = (emp) => {
    setEditingEmployee(emp);
    setEmployeeForm({
      name: emp.name,
      email: emp.email,
      password: '',
      permissions: [...(emp.permissions || [])],
    });
    setShowEmployeeForm(true);
  };
  const handleDeleteEmployee = async (id) => {
    if (window.confirm('حذف شود؟')) { await deleteEmployee(id); await loadEmployeesData(); }
  };

  // Blog (simplified, keep existing)
  const handleBlogImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBlogImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBlogImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };
  const readFileAsBase64 = (file) => new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  const handleBlogSubmit = async () => {
    if (!blogForm.title || !blogForm.slug || !blogForm.content) {
      alert('عنوان، اسلاگ و متن اصلی الزامی هستند');
      return;
    }
    const existing = blogPosts.find(p => p.slug === blogForm.slug && p.id !== editingBlogId);
    if (existing) {
      alert('این اسلاگ قبلاً استفاده شده است');
      return;
    }
    let imageBase64 = blogForm.image;
    if (blogImageFile) imageBase64 = await readFileAsBase64(blogImageFile);
    const postData = {
      title: blogForm.title,
      slug: blogForm.slug,
      excerpt: blogForm.excerpt,
      content: blogForm.content,
      image: imageBase64 || '',
    };
    if (editingBlogId) await updateBlogPost(editingBlogId, postData);
    else await addBlogPost(postData);
    await loadBlogPostsData();
    closeBlogForm();
  };
  const closeBlogForm = () => {
    setShowBlogForm(false);
    setEditingBlogId(null);
    setBlogForm({ title: '', slug: '', excerpt: '', content: '', image: '' });
    setBlogImageFile(null);
    setBlogImagePreview('');
  };
  const handleEditBlog = (post) => {
    setEditingBlogId(post.id);
    setBlogForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      image: post.image || '',
    });
    setBlogImagePreview(post.image || '');
    setShowBlogForm(true);
  };
  const handleDeleteBlog = async (id) => {
    if (window.confirm('حذف شود؟')) { await deleteBlogPost(id); await loadBlogPostsData(); }
  };
  const handleToggleHomepage = async (id, currentStatus) => {
    try {
      await toggleHomepageDisplay(id, !currentStatus);
      await loadBlogPostsData();
      alert(!currentStatus ? 'مقاله در صفحه اصلی نمایش داده می‌شود' : 'مقاله از صفحه اصلی حذف شد');
    } catch (error) {
      alert('خطا در تغییر وضعیت: ' + error.message);
    }
  };

  // Bulk discount
  const openBulkDiscountBar = () => {
    if (selectedIds.length === 0) {
      alert('هیچ محصولی انتخاب نشده است.');
      return;
    }
    setBulkDiscountBar({ isOpen: true, discountType: 'percent', discountValue: '' });
  };
  const closeBulkDiscountBar = () => {
    setBulkDiscountBar({ isOpen: false, discountType: 'percent', discountValue: '' });
  };
  const handleApplyBulkDiscount = async () => {
    const value = Number(bulkDiscountBar.discountValue);
    if (isNaN(value) || value <= 0) {
      alert('مقدار تخفیف باید عددی مثبت باشد.');
      return;
    }
    if (bulkDiscountBar.discountType === 'percent' && value > 100) {
      alert('درصد تخفیف نمی‌تواند بیش از ۱۰۰ باشد.');
      return;
    }
    await applyBulkDiscount(selectedIds, bulkDiscountBar.discountType, value);
    await refreshProducts();
    setSelectedIds([]);
    closeBulkDiscountBar();
    alert('تخفیف گروهی با موفقیت اعمال شد.');
  };

  // Templates
  const handleTemplateSubmit = async () => {
    if (!templateForm.title || !templateForm.description) {
      alert('عنوان و توضیحات الزامی است');
      return;
    }
    try {
      if (editingTemplateId) await updateProductTemplate(editingTemplateId, templateForm);
      else await addProductTemplate(templateForm);
      closeTemplateForm();
      await loadTemplatesData();
      alert('قالب ذخیره شد');
    } catch (error) {
      alert('خطا: ' + error.message);
    }
  };
  const handleEditTemplate = (template) => {
    setEditingTemplateId(template.id);
    setTemplateForm({
      size: template.size || '',
      glaze_type: template.glaze_type || '',
      title: template.title || '',
      description: template.description || '',
      usage_guide: template.usage_guide || '',
      maintenance: template.maintenance || '',
    });
    setShowTemplateForm(true);
  };
  const handleDeleteTemplate = async (id) => {
    if (window.confirm('حذف قالب؟')) { await deleteProductTemplate(id); await loadTemplatesData(); alert('قالب حذف شد'); }
  };
  const closeTemplateForm = () => {
    setShowTemplateForm(false);
    setEditingTemplateId(null);
    setTemplateForm({ size: '', glaze_type: '', title: '', description: '', usage_guide: '', maintenance: '' });
  };

  const getProductImage = (product) => {
    // بررسی وجود images
    let images = [];
    if (product.images) {
      if (typeof product.images === 'string') {
        try {
          images = JSON.parse(product.images);
        } catch(e) {
          images = product.images.split(',').map(s => s.trim()).filter(Boolean);
        }
      } else if (Array.isArray(product.images)) {
        images = product.images;
      }
    }
    
    console.log('Product images from DB:', images); // برای دیباگ
    
    // اگر تصویر وجود دارد
    if (images.length > 0) {
      let img = images[0];
      console.log('Raw image path:', img); // برای دیباگ
      
      // اگر آدرس کامل است
      if (img.startsWith('http')) return img;
      
      // اگر با uploads شروع می‌شود (بدون slash)
      if (img.startsWith('uploads/')) {
        return `/${img}`;
      }
      
      // اگر با /uploads شروع می‌شود
      if (img.startsWith('/uploads/')) {
        return `${img}`;
      }
      
      // اگر فقط نام فایل است
      return `/uploads/${img}`;
    }
    
    // تصویر پیش‌فرض
    return '/images/placeholder.jpg';
  };
  // ==================== RENDER FUNCTIONS ====================
  const renderProducts = () => (
  <>
    {/* نوار ابزار بالا */}
    <div className="products-action-bar">
      <div className="action-bar-left">
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          ➕ افزودن محصول
        </button>
      </div>
      
      <div className="action-bar-right">
        <select 
          ref={categorySelectRef} 
          value={filterCategory} 
          onChange={e => setFilterCategory(e.target.value)} 
          className="category-filter-select"
        >
          <option value="">همه دسته‌ها</option>
          {allCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        
        {selectedIds.length > 0 && (
          <>
            <button className="icon-btn" onClick={openBulkDiscountBar} title="تخفیف گروهی">
              🏷️
            </button>
            <button className="icon-btn delete-icon" onClick={handleBulkDelete} title="حذف گروهی">
              🗑️
            </button>
          </>
        )}
        
        <div className="search-wrapper">
          <input 
            type="text" 
            placeholder="جستجو بر اساس نام یا کد..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="search-input" 
          />
          <button className="search-btn">🔍</button>
        </div>
      </div>
    </div>

    {/* نوار تخفیف گروهی */}
    {bulkDiscountBar.isOpen && (
      <div className="bulk-discount-bar">
        <span className="selected-count">{selectedIds.length} محصول انتخاب شده</span>
        <div className="discount-type-selector">
          <label>
            <input 
              type="radio" 
              value="percent" 
              checked={bulkDiscountBar.discountType === 'percent'} 
              onChange={() => setBulkDiscountBar({ ...bulkDiscountBar, discountType: 'percent' })} 
            />
            تخفیف درصدی
          </label>
          <label>
            <input 
              type="radio" 
              value="amount" 
              checked={bulkDiscountBar.discountType === 'amount'} 
              onChange={() => setBulkDiscountBar({ ...bulkDiscountBar, discountType: 'amount' })} 
            />
            تخفیف مبلغی (تومان)
          </label>
        </div>
        <div className="discount-value-input">
          <input 
            type="number" 
            placeholder={bulkDiscountBar.discountType === 'percent' ? 'درصد تخفیف' : 'مبلغ تخفیف (تومان)'} 
            value={bulkDiscountBar.discountValue} 
            onChange={e => setBulkDiscountBar({ ...bulkDiscountBar, discountValue: e.target.value })} 
            min="0" 
            step={bulkDiscountBar.discountType === 'percent' ? '1' : '1000'} 
          />
        </div>
        <div className="bar-actions">
          <button className="btn-primary" onClick={handleApplyBulkDiscount}>اعمال تخفیف</button>
          <button className="btn-secondary" onClick={closeBulkDiscountBar}>انصراف</button>
        </div>
      </div>
    )}

    {/* مودال افزودن/ویرایش محصول - نسخه بهبود یافته */}
    {showForm && (
      <div className="form-modal" onClick={closeForm}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{editingId ? '✏️ ویرایش محصول' : '➕ افزودن محصول جدید'}</h3>
            <button className="modal-close" onClick={closeForm}>✖</button>
          </div>
          
          <div className="modal-body">
            <form onSubmit={handleSubmit} id="product-form">
              {/* ردیف 1: کد محصول و درجه */}
              <div className="form-row">
                <div className="form-group">
                  <label>کد محصول</label>
                  <input 
                    placeholder="مثال: PRD-001 (اختیاری)" 
                    value={form.productCode} 
                    onChange={e => setForm({ ...form, productCode: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>درجه</label>
                  <input 
                    placeholder="مثال: A, B, C" 
                    value={form.grade} 
                    onChange={e => setForm({ ...form, grade: e.target.value })} 
                  />
                </div>
              </div>
              
              {/* ردیف 2: نام و قیمت پایه */}
              <div className="form-row">
                <div className="form-group">
                  <label>نام محصول *</label>
                  <input 
                    placeholder="نام محصول" 
                    value={form.name} 
                    onChange={e => setForm({ ...form, name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>قیمت پایه (تومان) *</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={form.price} 
                    onChange={e => setForm({ ...form, price: e.target.value })} 
                  />
                </div>
              </div>
              
              {/* ردیف 3: قیمت همکار و تخفیف */}
              <div className="form-row">
                <div className="form-group">
                  <label>قیمت همکار (تومان)</label>
                  <input 
                    type="number" 
                    placeholder="اختیاری" 
                    value={form.partnerPrice} 
                    onChange={e => setForm({ ...form, partnerPrice: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>تخفیف (%)</label>
                  <input 
                    type="number" 
                    placeholder="0-100" 
                    value={form.discount} 
                    onChange={e => setForm({ ...form, discount: e.target.value })} 
                    min="0" 
                    max="100" 
                  />
                </div>
              </div>
              
              {/* ردیف 4: موجودی و دسته‌بندی */}
              <div className="form-row">
                <div className="form-group">
                  <label>موجودی (متر مربع)</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={form.stock} 
                    onChange={e => setForm({ ...form, stock: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>دسته‌بندی</label>
                  <input 
                    placeholder="مثال: کاشی, سرامیک" 
                    value={form.category} 
                    onChange={e => setForm({ ...form, category: e.target.value })} 
                  />
                </div>
              </div>
              
              {/* ردیف 5: شرکت سازنده و نوع خاک */}
              <div className="form-row">
                <div className="form-group">
                  <label>شرکت سازنده</label>
                  <select 
                    value={form.manufacturer} 
                    onChange={e => setForm({ ...form, manufacturer: e.target.value })}
                  >
                    <option value="">انتخاب شرکت</option>
                    {brands.map(brand => (
                      <option key={brand.id || brand.name} value={brand.name}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>نوع خاک</label>
                  <select 
                    value={form.glazeType} 
                    onChange={e => setForm({ ...form, glazeType: e.target.value })}
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="خاک سفید">خاک سفید</option>
                    <option value="خاک قرمز">خاک قرمز</option>
                    <option value="پرسلان">پرسلان</option>
                  </select>
                </div>
              </div>
              
              {/* ردیف 6: سایز و رنگ */}
              <div className="form-row">
                <div className="form-group">
                  <label>سایز</label>
                  <input 
                    placeholder="مثال: 60*60" 
                    value={form.size} 
                    onChange={e => setForm({ ...form, size: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>رنگ</label>
                  <input 
                    placeholder="مثال: سفید, کرم" 
                    value={form.color} 
                    onChange={e => setForm({ ...form, color: e.target.value })} 
                  />
                </div>
              </div>
              
              {/* ردیف 7: نوع لعاب و مناسب برای */}
              <div className="form-row">
                <div className="form-group">
                  <label>نوع لعاب</label>
                  <input 
                    placeholder="مثال: براق, مات" 
                    value={form.glaze} 
                    onChange={e => setForm({ ...form, glaze: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>مناسب برای</label>
                  <input 
                    placeholder="مثال: کف, دیوار" 
                    value={form.suitableFor} 
                    onChange={e => setForm({ ...form, suitableFor: e.target.value })} 
                  />
                </div>
              </div>
              
              {/* توضیحات کوتاه */}
              <div className="form-group full-width">
                <label>توضیحات کوتاه</label>
                <textarea 
                  placeholder="توضیحات مختصر محصول" 
                  rows="3" 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                />
              </div>

              {/* بخش آپلود تصاویر */}
              <div className="image-upload-section">
                <label>📸 تصاویر محصول</label>
                {imagePreviews.length > 0 && (
                  <div className="image-gallery">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="image-preview-item">
                        <img src={preview} alt={`تصویر ${idx + 1}`} />
                        <button type="button" onClick={() => handleRemoveImage(idx)}>✖</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    disabled={uploadingImages}
                    id="product-images"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => document.getElementById('product-images').click()}
                    disabled={uploadingImages}
                  >
                    {uploadingImages ? '⏳ در حال آپلود...' : '📤 انتخاب و آپلود تصاویر'}
                  </button>
                  <small>می‌توانید چندین تصویر را همزمان انتخاب کنید</small>
                </div>
              </div>

              {/* بخش تگ‌ها */}
              <div className="tags-section">
                <label>🏷️ تگ‌های محصول</label>
                <div className="tags-checkboxes">
                  {tags.map(tag => (
                    <label key={tag.name} className="tag-checkbox">
                      <input 
                        type="checkbox" 
                        checked={form.tags.includes(tag.name)} 
                        onChange={() => handleTagToggle(tag.name)} 
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* ردیف مخاطب */}
              <div className="form-group full-width">
                <label>مخاطب</label>
                <select 
                  value={form.audience} 
                  onChange={e => setForm({ ...form, audience: e.target.value })}
                >
                  <option value="all">نمایش برای همه</option>
                  <option value="customers">فقط مشتریان عادی</option>
                  <option value="partners">فقط همکاران</option>
                </select>
              </div>

              {/* توضیحات کامل */}
              <div className="form-group full-width">
                <label>توضیحات کامل (HTML مجاز)</label>
                <textarea 
                  placeholder="توضیحات کامل محصول" 
                  rows="6" 
                  value={form.fullDescription} 
                  onChange={e => setForm({ ...form, fullDescription: e.target.value })} 
                />
              </div>
            </form>
          </div>
          
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={closeForm}>انصراف</button>
            <button type="submit" form="product-form" className="btn-primary">
              {editingId ? '💾 ذخیره تغییرات' : '➕ افزودن محصول'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* جدول محصولات */}
    <div className="products-table-container">
      <table className="products-table">
        <thead>
          <tr>
            <th style={{ width: '40px' }}>
              <input 
                type="checkbox" 
                checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0} 
                onChange={toggleSelectAll} 
              />
            </th>
            <th style={{ width: '60px' }}>تصویر</th>
            <th>کد</th>
            <th>نام</th>
            <th>درجه</th>
            <th>قیمت</th>
            <th>قیمت همکار</th>
            <th>موجودی</th>
            <th>دسته</th>
            <th>سایز</th>
            <th>رنگ</th>
            <th style={{ width: '100px' }}>عملیات</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map(p => (
            <tr key={p.id}>
              <td>
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(p.id)} 
                  onChange={() => toggleSelect(p.id)} 
                />
              </td>
              <td>
                <img src={getProductImage(p)} alt={p.name} className="table-thumb" />
              </td>
              <td>{p.productCode || '---'}</td>
              <td className="product-name-cell">{p.name}</td>
              <td>{p.grade || '---'}</td>
              <td className="price-cell">{p.price?.toLocaleString()} تومان</td>
              <td className="price-cell">{p.partnerPrice ? p.partnerPrice.toLocaleString() : '---'} تومان</td>
              <td>{p.stock || 0}</td>
              <td>{p.category || '---'}</td>
              <td>{p.size || '---'}</td>
              <td>{p.color || '---'}</td>
              <td className="table-actions">
                <button className="edit-btn" onClick={() => handleEdit(p)} title="ویرایش">✏️</button>
                <button className="delete-btn" onClick={() => handleDelete(p.id)} title="حذف">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {filteredProducts.length === 0 && (
        <div className="empty-table">
          <p>هیچ محصولی یافت نشد</p>
        </div>
      )}
    </div>
  </>
);

  const renderBrands = () => {
    const filteredBrandList = brands.filter(brand =>
      brand.name?.toLowerCase().includes(brandSearchTerm.toLowerCase())
    );

    return (
      <div className="brands-view" style={{ padding: '0 4px' }}>
        {/* ===== هدر ===== */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 32,
          flexWrap: 'wrap',
          gap: 20
        }}>
          <div>
            <h2 style={{ color: '#13314c', margin: 0, fontSize: 28, fontWeight: '600' }}>مدیریت کارخانه‌ها</h2>
            <p style={{ color: '#5a6874', margin: '8px 0 0', fontSize: 15 }}>
              مدیریت شرکت‌ها و کارخانه‌های تولیدکننده محصولات
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {/* باکس جستجو */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              background: 'white', 
              border: '1px solid #d0d7de', 
              borderRadius: 12, 
              padding: '6px 6px 6px 16px'
            }}>
              <input 
                type="text" 
                placeholder="جستجوی کارخانه..." 
                value={brandSearchTerm}
                onChange={e => setBrandSearchTerm(e.target.value)}
                style={{ 
                  border: 'none', 
                  outline: 'none', 
                  padding: '10px 0', 
                  width: 240,
                  fontSize: 14,
                  fontFamily: 'inherit'
                }}
              />
              <button style={{ 
                background: '#13314c', 
                border: 'none', 
                color: 'white', 
                width: 40, 
                height: 40, 
                borderRadius: 10, 
                cursor: 'pointer',
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>🔍</button>
            </div>
            
            {/* ✅ این دکمه همان مودال قدیمی و کارآمد شما را باز می‌کند */}
            <button 
              className="btn-primary" 
              onClick={() => {
                setEditingBrandId(null);
                setBrandFormData({ name: '', logo: '', address: '', description: '', website: '', phone: '', email: '', enabled: true });
                setShowBrandForm(true); // <- این خط کلید حل مشکل است
              }}
              style={{ 
                padding: '12px 28px', 
                fontSize: 15,
                borderRadius: 40,
                background: '#13314c',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500',
                letterSpacing: '0.3px'
              }}
            >
              + افزودن کارخانه
            </button>
          </div>
        </div>

        {/* ===== جدول کارخانه‌ها ===== */}
        <div style={{ 
          background: 'white', 
          borderRadius: 20, 
          overflow: 'hidden', 
          border: '1px solid #e9ecef',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <thead>
              <tr style={{ background: '#f0f4f8', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '18px 20px', textAlign: 'right', fontWeight: '600', color: '#1e293b', fontSize: 16 }}>نام کارخانه</th>
                <th style={{ padding: '18px 20px', textAlign: 'right', fontWeight: '600', color: '#1e293b', fontSize: 16 }}>تلفن</th>
                <th style={{ padding: '18px 20px', textAlign: 'right', fontWeight: '600', color: '#1e293b', fontSize: 16 }}>شهر</th>
                <th style={{ padding: '18px 20px', textAlign: 'center', fontWeight: '600', color: '#1e293b', fontSize: 16 }}>وضعیت</th>
                <th style={{ padding: '18px 20px', textAlign: 'center', fontWeight: '600', color: '#1e293b', fontSize: 16 }}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredBrandList.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '80px', textAlign: 'center', color: '#6c757d' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🏭</div>
                    <p style={{ fontSize: 16, marginBottom: 16 }}>هیچ کارخانه‌ای ثبت نشده است.</p>
                    <button 
                      onClick={() => {
                        setEditingBrandId(null);
                        setBrandFormData({ name: '', logo: '', address: '', description: '', website: '', phone: '', email: '', enabled: true });
                        setShowBrandForm(true);
                      }}
                      style={{ padding: '10px 24px', background: '#13314c', color: 'white', border: 'none', borderRadius: 40, cursor: 'pointer', fontSize: 14 }}
                    >
                      + افزودن کارخانه
                    </button>
                  </td>
                </tr>
              ) : (
                filteredBrandList.map((brand, idx) => (
                  <tr key={brand.id} style={{ borderBottom: idx === filteredBrandList.length - 1 ? 'none' : '1px solid #e9ecef' }}>
                    <td style={{ padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        {brand.logo ? (
                          <img 
                            src={brand.logo.startsWith('http') ? brand.logo : `${brand.logo}`} 
                            alt={brand.name}
                            style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 10, background: '#f8f9fa', border: '1px solid #e9ecef' }}
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        ) : (
                          <div style={{ width: 44, height: 44, background: '#f0f4f8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏭</div>
                        )}
                        <span style={{ fontWeight: '600', color: '#1e293b', fontSize: 16 }}>{brand.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '18px 20px', color: '#334155', fontSize: 15 }}>{brand.phone || '—'}</td>
                    <td style={{ padding: '18px 20px', color: '#334155', fontSize: 15 }}>{brand.city || '—'}</td>
                    <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '5px 16px',
                        borderRadius: 40,
                        fontSize: 13,
                        fontWeight: '500',
                        background: brand.enabled === 1 ? '#e3fcec' : '#fee2e2',
                        color: brand.enabled === 1 ? '#0a5c2e' : '#b91c1c'
                      }}>
                        {brand.enabled === 1 ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'center'}}>
                        {/* ✅ این دکمه ها از توابع موجود استفاده می‌کنند */}
                        <button 
                        onClick={() => {
                          console.log('Clicked edit for:', brand);
                          setEditingBrandId(brand.id);
                          setBrandFormData({
                            name: brand.name || '',
                            logo: brand.logo || '',
                            address: brand.address || '',
                            description: brand.description || '',
                            website: brand.website || '',
                            phone: brand.phone || '',
                            email: brand.email || '',
                            enabled: brand.enabled === 1
                          });
                          if (brand.logo) {
                            setBrandLogoPreview(brand.logo.startsWith('http') ? brand.logo : `${brand.logo}`);
                          } else {
                            setBrandLogoPreview('');
                          }
                          setShowBrandForm(true);
                        }}
                        style={{ background: 'none', border: 'none', color: '#1c7385', fontSize: 20, cursor: 'pointer', padding: '6px 10px', borderRadius: 8 }}
                        title="ویرایش"
                      >✏️</button>
                        <button 
                          onClick={() => handleToggleBrand(brand.id, brand.enabled !== 1)}
                          style={{ background: 'none', border: 'none', color: brand.enabled === 1 ? '#e67e22' : '#0a5c2e', fontSize: 20, cursor: 'pointer', padding: '6px 10px', borderRadius: 8 }}
                          title={brand.enabled === 1 ? 'غیرفعال کردن' : 'فعال کردن'}
                        >{brand.enabled === 1 ? '🔒' : '✅'}</button>
                        <button 
                          onClick={() => handleDeleteBrand(brand.id)}
                          style={{ background: 'none', border: 'none', color: '#a70023', fontSize: 20, cursor: 'pointer', padding: '6px 10px', borderRadius: 8 }}
                          title="حذف"
                        >🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* ===== آمار پایین ===== */}
        {filteredBrandList.length > 0 && (
          <div style={{ 
            marginTop: 24, 
            padding: '16px 24px', 
            background: '#f8fafc', 
            borderRadius: 16,
            display: 'flex',
            gap: 40,
            fontSize: 14,
            color: '#334155',
            border: '1px solid #e9ecef'
          }}>
            <span>📊 <strong>جمع کارخانه‌ها:</strong> {filteredBrandList.length}</span>
            <span>✅ <strong>فعال:</strong> {filteredBrandList.filter(b => b.enabled === 1).length}</span>
            <span>❌ <strong>غیرفعال:</strong> {filteredBrandList.filter(b => b.enabled !== 1).length}</span>
          </div>
        )}

        {/* ===== مودال افزودن/ویرایش کارخانه ===== */}
        {showBrandForm && (
          <div className="modal-overlay" onClick={() => setShowBrandForm(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
              <div className="modal-header">
                <h3>{editingBrandId ? '✏️ ویرایش کارخانه' : '➕ افزودن کارخانه جدید'}</h3>
                <button className="modal-close" onClick={() => setShowBrandForm(false)}>✖</button>
              </div>
              <div className="modal-body">
                {/* نام کارخانه */}
                <div className="form-group">
                  <label>نام کارخانه *</label>
                  <input 
                    type="text" 
                    value={brandFormData.name} 
                    onChange={e => setBrandFormData({...brandFormData, name: e.target.value})} 
                    placeholder="مثال: حافظ"
                  />
                </div>
                
                {/* آپلود لوگو */}
                <div className="form-group">
                  <label>لوگو کارخانه</label>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {brandLogoPreview && (
                      <img 
                        src={brandLogoPreview} 
                        alt="پیش‌نمایش لوگو" 
                        style={{ width: 80, height: 80, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 8, padding: 5 }}
                      />
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBrandLogoUpload}
                        disabled={uploadingLogo}
                        style={{ display: 'none' }}
                        id="brand-logo-upload"
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => document.getElementById('brand-logo-upload').click()}
                        disabled={uploadingLogo}
                        style={{ marginLeft: '10px' }}
                      >
                        {uploadingLogo ? '⏳ در حال آپلود...' : '📤 انتخاب و آپلود لوگو'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setBrandFormData({...brandFormData, logo: ''});
                          setBrandLogoPreview('');
                        }}
                        style={{ background: '#a70023', color: 'white' }}
                      >
                        حذف لوگو
                      </button>
                    </div>
                  </div>
                  <small style={{ color: '#7c8788', display: 'block', marginTop: '8px' }}>فایل تصویری (JPG, PNG, GIF) حداکثر ۲ مگابایت</small>
                </div>
                
                {/* آدرس */}
                <div className="form-group">
                  <label>آدرس</label>
                  <input 
                    type="text" 
                    value={brandFormData.address} 
                    onChange={e => setBrandFormData({...brandFormData, address: e.target.value})} 
                    placeholder="آدرس کامل کارخانه"
                  />
                </div>
                
                {/* توضیحات */}
                <div className="form-group">
                  <label>توضیحات</label>
                  <textarea 
                    rows="3" 
                    value={brandFormData.description} 
                    onChange={e => setBrandFormData({...brandFormData, description: e.target.value})} 
                    placeholder="توضیحات درباره کارخانه"
                  />
                </div>
                
                {/* وبسایت */}
                <div className="form-group">
                  <label>وب‌سایت</label>
                  <input 
                    type="text" 
                    value={brandFormData.website} 
                    onChange={e => setBrandFormData({...brandFormData, website: e.target.value})} 
                    placeholder="https://example.com"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>تلفن</label>
                    <input 
                      type="text" 
                      value={brandFormData.phone} 
                      onChange={e => setBrandFormData({...brandFormData, phone: e.target.value})} 
                      placeholder="تلفن کارخانه"
                    />
                  </div>
                  <div className="form-group">
                    <label>ایمیل</label>
                    <input 
                      type="email" 
                      value={brandFormData.email} 
                      onChange={e => setBrandFormData({...brandFormData, email: e.target.value})} 
                      placeholder="info@example.com"
                    />
                  </div>
                </div>
                
                {/* فعال/غیرفعال */}
                <div className="form-group">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={brandFormData.enabled} 
                      onChange={e => setBrandFormData({...brandFormData, enabled: e.target.checked})} 
                    /> 
                    فعال
                  </label>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowBrandForm(false)}>انصراف</button>
                <button className="btn-primary" onClick={handleBrandSubmit}>💾 ذخیره</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTags = () => (
    <div className="tags-view">
      <h2>مدیریت تگ‌ها</h2>
      <div className="tag-form">
        <input type="text" placeholder="نام تگ جدید" value={tagForm} onChange={e => setTagForm(e.target.value)} />
        {editingTag ? (
          <>
            <button className="btn-primary" onClick={handleUpdateTag}>ذخیره</button>
            <button className="btn-secondary" onClick={cancelEditTag}>انصراف</button>
          </>
        ) : (
          <button className="btn-primary" onClick={handleAddTag}>افزودن</button>
        )}
      </div>
      <div className="tags-list">
        <h3>لیست تگ‌ها ({tags.length})</h3>
        <table className="tags-table">
          <thead>
            <tr><th>نام تگ</th><th>فعال</th><th>عملیات</th></tr>
          </thead>
          <tbody>
            {tags.map(tag => (
              <tr key={tag.name}>
                <td>{tag.name}</td>
                <td><input type="checkbox" checked={tag.enabled} onChange={e => handleToggleTag(tag.name, e.target.checked)} /></td>
                <td><button className="edit-btn" onClick={() => startEditTag(tag.name)}>✏️</button> <button className="delete-btn" onClick={() => handleDeleteTag(tag.name)}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // درج لینک در متن انتخاب‌شده textarea
  const insertLinkInDescription = () => {
    const textarea = document.getElementById('template-description');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = templateForm.description.substring(start, end);
    if (!selectedText) {
      alert('لطفاً متنی را که می‌خواهید لینک شود، انتخاب کنید.');
      return;
    }
    const url = prompt('آدرس کامل مقاله وبلاگ را وارد کنید (مثال: /blog/راهنمای-خرید):');
    if (!url) return;
    const linkHtml = `<a href="${url}" target="_blank">${selectedText}</a>`;
    const newDescription = templateForm.description.substring(0, start) + linkHtml + templateForm.description.substring(end);
    setTemplateForm({ ...templateForm, description: newDescription });
    // پس از آپدیت، فوکوس را به textarea برگردانده و جای cursor را تنظیم کنید (اختیاری)
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + linkHtml.length);
    }, 50);
  };

  const renderTemplates = () => (
    <div className="templates-view">
      <div className="action-bar"><button className="btn-primary" onClick={() => setShowTemplateForm(true)}>➕ قالب جدید</button></div>
      {showTemplateForm && (
        <div className="form-modal">
          <div className="modal-content">
            <h3>{editingTemplateId ? 'ویرایش قالب' : 'قالب جدید'}</h3>
            <form onSubmit={e => { e.preventDefault(); handleTemplateSubmit(); }}>
              <div className="form-row">
                <input type="text" placeholder="سایز" value={templateForm.size} onChange={e => setTemplateForm({ ...templateForm, size: e.target.value })} />
                <input type="text" placeholder="نوع لعاب" value={templateForm.glaze_type} onChange={e => setTemplateForm({ ...templateForm, glaze_type: e.target.value })} />
              </div>
              <input type="text" placeholder="عنوان *" value={templateForm.title} onChange={e => setTemplateForm({ ...templateForm, title: e.target.value })} required />
              <div>
                <textarea
                  id="template-description"
                  placeholder="توضیحات کامل *"
                  rows="5"
                  value={templateForm.description}
                  onChange={e => setTemplateForm({ ...templateForm, description: e.target.value })}
                  required
                  style={{ width: '100%', marginBottom: '8px' }}
                />
                <button
                  type="button"
                  onClick={insertLinkInDescription}
                  style={{
                    background: '#1c7385',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    marginBottom: '10px'
                  }}
                >
                  🔗 درج لینک به مقاله وبلاگ
                </button>
              </div>
              <textarea placeholder="راهنمای کاربرد" rows="3" value={templateForm.usage_guide} onChange={e => setTemplateForm({ ...templateForm, usage_guide: e.target.value })} />
              <textarea placeholder="نحوه نگهداری" rows="3" value={templateForm.maintenance} onChange={e => setTemplateForm({ ...templateForm, maintenance: e.target.value })} />
              <div className="form-actions">
                <button type="submit" className="btn-primary">ذخیره</button>
                <button type="button" className="btn-secondary" onClick={closeTemplateForm}>انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="table-container">
        <table className="products-table">
          <thead>
            <tr><th>سایز</th><th>نوع لعاب</th><th>عنوان</th><th>توضیحات</th><th>عملیات</th></tr>
          </thead>
          <tbody>
            {templates.map(template => (
              <tr key={template.id}>
                <td>{template.size || '—'}</td>
                <td>{template.glaze_type || '—'}</td>
                <td>{template.title}</td>
                <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{template.description ? template.description.substring(0, 80) : '—'}...</td>
                <td className="table-actions">
                  <button className="edit-btn" onClick={() => handleEditTemplate(template)}>✏️</button>
                  <button className="delete-btn" onClick={() => handleDeleteTemplate(template.id)}>🗑️</button>
                </td>
              </tr>
            ))}
            {templates.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center' }}>هیچ قالبی ثبت نشده است</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPartners = () => {
    const handleInitialApprove = async (id) => {
      if (window.confirm('آیا از تأیید اولیه این همکار اطمینان دارید؟ با تأیید اولیه، پنل همکار باز می‌شود اما امکان ثبت سفارش ندارد.')) {
        try {
          const res = await fetch(`/api/partners/${id}/initial-approve`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await res.json();
          if (data.success) {
            alert('تأیید اولیه با موفقیت انجام شد');
            loadPartners();
          } else {
            alert('خطا: ' + data.error);
          }
        } catch (err) {
          console.error(err);
          alert('خطا در تأیید اولیه');
        }
      }
    };

    const handleFinalApprove = async (id) => {
      if (window.confirm('آیا از تأیید نهایی این همکار اطمینان دارید؟ پس از تأیید، همکار می‌تواند سفارش ثبت کند.')) {
        try {
          const res = await fetch(`/api/partners/${id}/final-approve`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_notes: partnerAdminNote })
          });
          const data = await res.json();
          if (data.success) {
            alert('تأیید نهایی با موفقیت انجام شد');
            setShowPartnerDetailModal(false);
            loadPartners();
          } else {
            alert('خطا: ' + data.error);
          }
        } catch (err) {
          console.error(err);
          alert('خطا در تأیید نهایی');
        }
      }
    };

    const handleReject = async (id) => {
      if (window.confirm('آیا از رد این درخواست اطمینان دارید؟')) {
        try {
          const res = await fetch(`/api/partners/${id}/reject`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await res.json();
          if (data.success) {
            alert('درخواست رد شد');
            loadPartners();
          } else {
            alert('خطا: ' + data.error);
          }
        } catch (err) {
          console.error(err);
          alert('خطا در رد درخواست');
        }
      }
    };

    const handleFileUpload = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      
      setPartnerUploading(true);
      const formData = new FormData();
      files.forEach(file => formData.append('documents', file));
      
      try {
        const res = await fetch('/api/upload/documents', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          setPartnerUploadedFiles([...partnerUploadedFiles, ...data.files]);
        } else {
          alert('خطا در آپلود فایل');
        }
      } catch (err) {
        console.error(err);
        alert('خطا در آپلود فایل');
      } finally {
        setPartnerUploading(false);
      }
    };

    const removeFile = (index) => {
      const newFiles = [...partnerUploadedFiles];
      newFiles.splice(index, 1);
      setPartnerUploadedFiles(newFiles);
    };

    const getStatusText = (status) => {
      const map = {
        pending: '⏳ در انتظار تأیید',
        initial_approved: '✅ تأیید اولیه شده (نمی‌تواند سفارش دهد)',
        final_approved: '🎉 تأیید نهایی شده',
        rejected: '❌ رد شده'
      };
      return map[status] || status;
    };

    const getStatusClass = (status) => {
      const map = {
        pending: 'status-pending',
        initial_approved: 'status-initial',
        final_approved: 'status-final',
        rejected: 'status-rejected'
      };
      return map[status] || '';
    };

    return (
      <div className="partners-view">
        <div className="partners-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 25,
          flexWrap: 'wrap',
          gap: 15
        }}>
          <h2 style={{ color: '#13314c', margin: 0, fontSize: 28 }}>🤝 درخواست‌های همکاری</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <label style={{ fontWeight: 'bold', color: '#13314c' }}>مرتب‌سازی بر اساس تاریخ:</label>
            <select 
              value={partnersSortOrder} 
              onChange={e => setPartnersSortOrder(e.target.value)}
              style={{ padding: '8px 16px', borderRadius: 30, border: '1px solid #ddd', fontSize: 14 }}
            >
              <option value="desc">جدیدترین اول</option>
              <option value="asc">قدیمی‌ترین اول</option>
            </select>
          </div>
        </div>

        {loadingPartners ? (
          <div style={{ textAlign: 'center', padding: 50 }}>در حال بارگذاری...</div>
        ) : partnersList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, background: 'white', borderRadius: 20 }}>
            <p style={{ fontSize: 16, color: '#7c8788' }}>هیچ درخواست همکاری در انتظار نیست.</p>
          </div>
        ) : (
          <div className="table-container" style={{ 
            background: 'white', 
            borderRadius: 24, 
            overflow: 'hidden', 
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            border: '1px solid #e3dede'
          }}>
            <table className="products-table" style={{ width: '100%', fontSize: 15, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f4f7', borderBottom: '2px solid #e3dede' }}>
                  <th style={{ padding: '15px', textAlign: 'right', fontSize: 16 }}>نام</th>
                  <th style={{ padding: '15px', textAlign: 'right', fontSize: 16 }}>شماره موبایل</th>
                  <th style={{ padding: '15px', textAlign: 'right', fontSize: 16 }}>ایمیل</th>
                  <th style={{ padding: '15px', textAlign: 'right', fontSize: 16 }}>نام شرکت</th>
                  <th style={{ padding: '15px', textAlign: 'right', fontSize: 16 }}>تاریخ ثبت</th>
                  <th style={{ padding: '15px', textAlign: 'right', fontSize: 16 }}>وضعیت</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontSize: 16 }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {partnersList.map(partner => (
                  <tr key={partner.id} style={{ borderBottom: '1px solid #e3dede' }}>
                    <td style={{ padding: '12px' }}>{partner.user_name || '—'}</td>
                    <td style={{ padding: '12px' }}>{partner.user_mobile || '—'}</td>
                    <td style={{ padding: '12px' }}>{partner.user_email || '—'}</td>
                    <td style={{ padding: '12px' }}>{partner.company_name || '—'}</td>
                    <td style={{ padding: '12px' }}>{new Date(partner.created_at).toLocaleDateString('fa-IR')}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`status-badge ${getStatusClass(partner.status || 'pending')}`} style={{ fontSize: 12, padding: '4px 12px' }}>
                        {getStatusText(partner.status || 'pending')}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* دکمه جزئیات */}
                        <button 
                          className="btn-view" 
                          onClick={() => {
                            setSelectedPartner(partner);
                            setPartnerUploadedFiles(partner.documents ? JSON.parse(partner.documents) : []);
                            setPartnerAdminNote(partner.admin_notes || '');
                            setShowPartnerDetailModal(true);
                          }}
                          style={{ background: '#1c7385', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12 }}
                        >
                          🔍 جزئیات
                        </button>
                        
                        {/* دکمه تأیید اولیه - فقط برای وضعیت pending */}
                        {(partner.status === 'pending' || !partner.status) && (
                          <button 
                            className="btn-approve" 
                            onClick={() => handleInitialApprove(partner.id)}
                            style={{ background: '#27ae60', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12 }}
                          >
                            ✅ تأیید اولیه
                          </button>
                        )}
                        
                        {/* دکمه تأیید نهایی - فقط برای وضعیت initial_approved */}
                        {partner.status === 'initial_approved' && (
                          <button 
                            className="btn-final-approve" 
                            onClick={() => {
                              setSelectedPartner(partner);
                              setPartnerUploadedFiles(partner.documents ? JSON.parse(partner.documents) : []);
                              setPartnerAdminNote(partner.admin_notes || '');
                              setShowPartnerDetailModal(true);
                            }}
                            style={{ background: '#ff9800', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12 }}
                          >
                            🎉 تأیید نهایی
                          </button>
                        )}
                        
                        {/* دکمه رد - برای همه وضعیت‌ها به جز final_approved */}
                        {partner.status !== 'final_approved' && (
                          <button 
                            className="btn-reject" 
                            onClick={() => handleReject(partner.id)}
                            style={{ background: '#a70023', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12 }}
                          >
                            ❌ رد
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* مودال جزئیات */}
        {showPartnerDetailModal && selectedPartner && (
          <div className="modal-overlay" onClick={() => setShowPartnerDetailModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
              background: 'white', 
              padding: 30, 
              borderRadius: 24, 
              maxWidth: 700, 
              width: '90%',
              maxHeight: '85vh',
              overflow: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
                <h3 style={{ margin: 0, color: '#13314c', fontSize: 24 }}>📄 جزئیات درخواست همکاری</h3>
                <button onClick={() => setShowPartnerDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>✖</button>
              </div>

              {/* اطلاعات شخصی */}
              <div className="info-section" style={{ background: '#f0f4f7', padding: 20, borderRadius: 16, marginBottom: 25 }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#13314c' }}>اطلاعات شخصی</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                  <p><strong>نام:</strong> {selectedPartner.user_name || '—'}</p>
                  <p><strong>شماره موبایل:</strong> {selectedPartner.user_mobile || '—'}</p>
                  <p><strong>ایمیل:</strong> {selectedPartner.user_email || '—'}</p>
                  <p><strong>نام شرکت:</strong> {selectedPartner.company_name || '—'}</p>
                  <p><strong>شهر:</strong> {selectedPartner.city || '—'}</p>
                  <p><strong>آدرس:</strong> {selectedPartner.address || '—'}</p>
                  <p><strong>تاریخ ثبت:</strong> {new Date(selectedPartner.created_at).toLocaleDateString('fa-IR')}</p>
                  <p><strong>وضعیت:</strong> <span className={`status-badge ${getStatusClass(selectedPartner.status)}`}>{getStatusText(selectedPartner.status)}</span></p>
                </div>
              </div>

              {/* نمایش مدارک آپلود شده توسط همکار */}
              {partnerUploadedFiles.length > 0 && (
                <div className="documents-preview" style={{ marginBottom: 25 }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#13314c' }}>📎 مدارک آپلود شده توسط همکار:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15 }}>
                    {partnerUploadedFiles.map((file, idx) => (
                      <div key={idx} style={{ 
                        background: '#f0f4f7', 
                        borderRadius: 12, 
                        padding: '10px 15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                      }}>
                        <span>📄 {file.originalName || file.filename}</span>
                        <a 
                          href={`${file.path}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#1c7385', textDecoration: 'none' }}
                        >
                          🔍 مشاهده
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* بخش آپلود مدارک توسط ادمین */}
              <div className="documents-section" style={{ marginBottom: 25 }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#13314c' }}>📎 آپلود مدارک جدید (اختیاری)</h4>
                
                <div className="upload-area" style={{ 
                  border: '2px dashed #1c7385', 
                  borderRadius: 16, 
                  padding: 20, 
                  textAlign: 'center',
                  marginBottom: 15
                }}>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleFileUpload}
                    disabled={partnerUploading}
                    id="admin-document-upload"
                    style={{ display: 'none' }}
                  />
                  <button 
                    type="button"
                    className="btn-secondary"
                    onClick={() => document.getElementById('admin-document-upload').click()}
                    disabled={partnerUploading}
                    style={{ padding: '10px 24px' }}
                  >
                    {partnerUploading ? 'در حال آپلود...' : '📤 آپلود مدارک (عکس یا PDF)'}
                  </button>
                </div>
              </div>

              {/* یادداشت ادمین */}
              <div className="notes-section" style={{ marginBottom: 25 }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#13314c' }}>📝 یادداشت ادمین</h4>
                <textarea
                  value={partnerAdminNote}
                  onChange={e => setPartnerAdminNote(e.target.value)}
                  placeholder="یادداشت‌های خود را وارد کنید..."
                  rows="3"
                  style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #ddd', fontSize: 14, fontFamily: 'inherit' }}
                />
              </div>

              {/* دکمه‌های اقدام */}
              <div className="action-buttons" style={{ display: 'flex', gap: 15, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {(selectedPartner.status === 'pending' || !selectedPartner.status) && (
                  <button 
                    className="btn-primary" 
                    onClick={() => handleInitialApprove(selectedPartner.id)}
                    style={{ background: '#27ae60' }}
                  >
                    ✅ تأیید اولیه
                  </button>
                )}
                
                {selectedPartner.status === 'initial_approved' && (
                  <button 
                    className="btn-primary" 
                    onClick={() => handleFinalApprove(selectedPartner.id)}
                    style={{ background: '#1c7385' }}
                  >
                    🎉 تأیید نهایی و فعال‌سازی کامل
                  </button>
                )}
                
                {selectedPartner.status !== 'final_approved' && (
                  <button 
                    className="btn-danger" 
                    onClick={() => handleReject(selectedPartner.id)}
                    style={{ background: '#a70023', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 30, cursor: 'pointer' }}
                  >
                    ❌ رد درخواست
                  </button>
                )}
                
                <button 
                  className="btn-secondary" 
                  onClick={() => setShowPartnerDetailModal(false)}
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEmployees = () => (
    <div className="employees-view">
      <div className="action-bar"><button className="btn-primary" onClick={() => { setEditingEmployee(null); setEmployeeForm({ name: '', email: '', password: '', permissions: [] }); setShowEmployeeForm(true); }}>➕ کارمند جدید</button></div>
      {showEmployeeForm && (
        <div className="form-modal">
          <div className="modal-content">
            <h3>{editingEmployee ? 'ویرایش کارمند' : 'کارمند جدید'}</h3>
            <div className="form-row">
              <input placeholder="نام کامل" value={employeeForm.name} onChange={e => setEmployeeForm({ ...employeeForm, name: e.target.value })} required />
              <input placeholder="ایمیل" value={employeeForm.email} onChange={e => setEmployeeForm({ ...employeeForm, email: e.target.value })} required />
            </div>
            <input type="password" placeholder="رمز عبور" value={employeeForm.password} onChange={e => setEmployeeForm({ ...employeeForm, password: e.target.value })} required={!editingEmployee} />
            <div className="permissions-grid">
              {PERMISSIONS_LIST.map(p => <label key={p.key}><input type="checkbox" checked={employeeForm.permissions.includes(p.key)} onChange={e => { if (e.target.checked) setEmployeeForm({ ...employeeForm, permissions: [...employeeForm.permissions, p.key] }); else setEmployeeForm({ ...employeeForm, permissions: employeeForm.permissions.filter(k => k !== p.key) }); }} /> {p.label}</label>)}
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={handleEmployeeSubmit}>ذخیره</button>
              <button className="btn-secondary" onClick={() => { setShowEmployeeForm(false); setEditingEmployee(null); }}>انصراف</button>
            </div>
          </div>
        </div>
      )}
      <div className="table-container">
        <table className="products-table">
          <thead>
            <tr><th>نام</th><th>ایمیل</th><th>دسترسی‌ها</th><th>عملیات</th></tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id}>
                <td>{emp.name}</td>
                <td>{emp.email}</td>
                <td>{emp.permissions?.length || 0} مجوز</td>
                <td className="table-actions">
                  <button className="edit-btn" onClick={() => handleEditEmployee(emp)}>✏️</button>
                  <button className="delete-btn" onClick={() => handleDeleteEmployee(emp.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBlog = () => (
    <div className="blog-manager">
      <div className="action-bar"><button className="btn-primary" onClick={() => setShowBlogForm(true)}>➕ نوشته جدید</button></div>
      {showBlogForm && (
        <div className="form-modal">
          <div className="modal-content">
            <h3>{editingBlogId ? 'ویرایش نوشته' : 'نوشته جدید'}</h3>
            <div className="form-row">
              <input type="text" placeholder="عنوان *" value={blogForm.title} onChange={e => setBlogForm({ ...blogForm, title: e.target.value })} required />
              <input type="text" placeholder="اسلاگ (آدرس یکتا) *" value={blogForm.slug} onChange={e => setBlogForm({ ...blogForm, slug: e.target.value })} required />
            </div>
            <textarea placeholder="خلاصه (توضیح کوتاه)" rows="3" value={blogForm.excerpt} onChange={e => setBlogForm({ ...blogForm, excerpt: e.target.value })} />
            <div className="form-row">
              <div className="image-upload" style={{ flex: 1 }}>
                <label>تصویر شاخص:</label>
                <input type="file" accept="image/*" onChange={handleBlogImageChange} />
                {blogImagePreview && <img src={blogImagePreview} alt="پیش‌نمایش" style={{ width: '100px', marginTop: '10px' }} />}
              </div>
            </div>
            <textarea placeholder="متن اصلی (HTML مجاز) *" rows="10" value={blogForm.content} onChange={e => setBlogForm({ ...blogForm, content: e.target.value })} required />
            {blogForm.content && (
              <div className="html-preview" style={{ border: '1px solid #ddd', padding: '10px', marginTop: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
                <strong>📄 پیش‌نمایش محتوا:</strong>
                <div dangerouslySetInnerHTML={{ __html: blogForm.content }} />
              </div>
            )}
            <div className="form-actions">
              <button className="btn-primary" onClick={handleBlogSubmit}>ذخیره</button>
              <button className="btn-secondary" onClick={closeBlogForm}>انصراف</button>
            </div>
          </div>
        </div>
      )}
      <div className="table-container">
        <table className="products-table">
          <thead>
            <tr><th>تصویر</th><th>عنوان</th><th>اسلاگ</th><th>تاریخ</th><th>نمایش در صفحه اصلی</th><th>عملیات</th></tr>
          </thead>
          <tbody>
            {blogPosts.map(post => (
              <tr key={post.id}>
                <td>{post.image ? <img src={post.image} style={{ width: '50px', height: '50px', objectFit: 'cover' }} alt="" /> : '---'}</td>
                <td>{post.title}</td>
                <td>{post.slug}</td>
                <td>{new Date(post.created_at || post.date).toLocaleDateString('fa-IR')}</td>
                <td><button className={`homepage-toggle-btn ${post.show_on_homepage ? 'active' : ''}`} onClick={() => handleToggleHomepage(post.id, post.show_on_homepage)}>{post.show_on_homepage ? '✅ نمایش داده می‌شود' : '⬜ نمایش داده نمی‌شود'}</button></td>
                <td className="table-actions">
                  <button className="edit-btn" onClick={() => handleEditBlog(post)}>✏️</button>
                  <button className="delete-btn" onClick={() => handleDeleteBlog(post.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
    // دریافت جزئیات یک مشتری
  const fetchCustomerDetails = async (id) => {
    try {
      const res = await fetch(`/api/users/${id}`);
      const data = await res.json();
      setSelectedCustomer(data);
      setShowCustomerModal(true);
    } catch (err) {
      alert('خطا در دریافت اطلاعات مشتری');
    }
  };

  // تغییر نوع (customer ↔ partner)
  const handleChangeCustomerType = async (id, newType) => {
    if (window.confirm(`آیا می‌خواهید نوع این کاربر به "${newType === 'partner' ? 'همکار' : 'مشتری عادی'}" تغییر یابد؟`)) {
      try {
        const res = await fetch(`/api/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: newType }),
        });
        if (!res.ok) throw new Error();
        alert('نوع کاربر با موفقیت تغییر کرد');
        loadCustomersData(); // رفرش لیست
        if (selectedCustomer && selectedCustomer.id === id) {
          setSelectedCustomer(prev => ({ ...prev, type: newType }));
        }
      } catch (err) {
        alert('خطا در تغییر نوع کاربر');
      }
    }
  };

  // تغییر وضعیت فعال/غیرفعال
  const handleToggleActive = async (id, currentActive) => {
    const newStatus = currentActive ? 0 : 1;
    const action = newStatus ? 'فعال' : 'مسدود';
    if (window.confirm(`آیا می‌خواهید این کاربر را ${action} کنید؟`)) {
      try {
        const res = await fetch(`/api/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: newStatus }),
        });
        if (!res.ok) throw new Error();
        alert(`کاربر ${action} شد`);
        loadCustomersData();
        if (selectedCustomer && selectedCustomer.id === id) {
          setSelectedCustomer(prev => ({ ...prev, is_active: newStatus === 1 }));
        }
      } catch (err) {
        alert('خطا در تغییر وضعیت کاربر');
      }
    }
  };

  // ایجاد مشتری جدید
  const handleCreateCustomer = async () => {
    const { name, mobile, email, password, type } = newCustomerForm;
    if (!name || !mobile) {
      alert('نام و شماره موبایل الزامی است');
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mobile, email: email || undefined, password, type }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      alert('مشتری جدید ایجاد شد');
      setShowNewCustomerForm(false);
      setNewCustomerForm({ name: '', mobile: '', email: '', password: '', type: 'customer' });
      loadCustomersData();
    } catch (err) {
      alert('خطا: ' + err.message);
    }
  };

  

  const renderCustomers = () => {
    const handleDeleteCustomer = async (id, name) => {
      if (window.confirm(`آیا از حذف "${name}" اطمینان دارید؟`)) {
        try {
          const res = await fetch(`/api/users/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            alert('کاربر با موفقیت حذف شد');
            loadCustomersData();
          } else {
            alert('خطا در حذف کاربر');
          }
        } catch (err) {
          console.error('Error deleting user:', err);
          alert('خطا در حذف کاربر');
        }
      }
    };

    return (
      <div className="customers-view">
        {/* هدر با دکمه در گوشه */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 30,
          flexWrap: 'wrap',
          gap: 15
        }}>
          <h2 style={{ color: '#13314c', margin: 0, fontSize: 32 }}>👥 لیست مشتریان</h2>
          <button 
            className="btn-primary" 
            onClick={() => setShowNewCustomerForm(true)}
            style={{ 
              padding: '10px 24px', 
              fontSize: 15,
              borderRadius: 30,
              background: '#1c7385'
            }}
          >
            ➕ ایجاد مشتری جدید
          </button>
        </div>

        {/* فرم ایجاد مشتری جدید - مودال */}
        {showNewCustomerForm && (
          <div className="modal-overlay" onClick={() => setShowNewCustomerForm(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
              background: 'white', 
              padding: 30, 
              borderRadius: 24, 
              maxWidth: 550, 
              width: '90%'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
                <h3 style={{ margin: 0, color: '#13314c', fontSize: 24 }}>ایجاد مشتری جدید</h3>
                <button onClick={() => setShowNewCustomerForm(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>✖</button>
              </div>
              <div className="form-row">
                <input 
                  placeholder="نام کامل *" 
                  value={newCustomerForm.name}
                  onChange={e => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  style={{ padding: '12px 14px', fontSize: 15, borderRadius: 10, border: '1px solid #ddd' }}
                />
                <input 
                  placeholder="شماره موبایل *" 
                  value={newCustomerForm.mobile}
                  onChange={e => setNewCustomerForm({ ...newCustomerForm, mobile: e.target.value })}
                  style={{ padding: '12px 14px', fontSize: 15, borderRadius: 10, border: '1px solid #ddd' }}
                />
              </div>
              <div className="form-row">
                <input 
                  placeholder="ایمیل (اختیاری)" 
                  value={newCustomerForm.email}
                  onChange={e => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                  style={{ padding: '12px 14px', fontSize: 15, borderRadius: 10, border: '1px solid #ddd' }}
                />
                <input 
                  placeholder="رمز عبور (اختیاری)" 
                  type="password" 
                  value={newCustomerForm.password}
                  onChange={e => setNewCustomerForm({ ...newCustomerForm, password: e.target.value })}
                  style={{ padding: '12px 14px', fontSize: 15, borderRadius: 10, border: '1px solid #ddd' }}
                />
              </div>
              <div className="form-row">
                <select 
                  value={newCustomerForm.type} 
                  onChange={e => setNewCustomerForm({ ...newCustomerForm, type: e.target.value })}
                  style={{ padding: '12px 14px', fontSize: 15, borderRadius: 10, border: '1px solid #ddd', width: '100%' }}
                >
                  <option value="customer">مشتری عادی</option>
                  <option value="partner">همکار</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 15, justifyContent: 'flex-end', marginTop: 25 }}>
                <button className="btn-secondary" onClick={() => setShowNewCustomerForm(false)} style={{ padding: '10px 24px', fontSize: 15, borderRadius: 30 }}>انصراف</button>
                <button className="btn-primary" onClick={handleCreateCustomer} style={{ padding: '10px 24px', fontSize: 15, borderRadius: 30 }}>ذخیره</button>
              </div>
            </div>
          </div>
        )}

        {/* مودال نمایش جزئیات و ویرایش */}
        {showCustomerModal && selectedCustomer && (
          <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
            <div className="duplicate-modal" style={{ width: '550px', background: 'white', borderRadius: 24, padding: 30 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
                <h3 style={{ margin: 0, color: '#13314c', fontSize: 24 }}>جزئیات کاربر</h3>
                <button onClick={() => setShowCustomerModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>✖</button>
              </div>
              <p style={{ fontSize: 16, marginBottom: 15 }}><strong style={{ width: 120, display: 'inline-block' }}>نام:</strong> {selectedCustomer.name}</p>
              <p style={{ fontSize: 16, marginBottom: 15 }}><strong style={{ width: 120, display: 'inline-block' }}>موبایل:</strong> {selectedCustomer.mobile}</p>
              <p style={{ fontSize: 16, marginBottom: 15 }}><strong style={{ width: 120, display: 'inline-block' }}>ایمیل:</strong> {selectedCustomer.email || '—'}</p>
              <p style={{ fontSize: 16, marginBottom: 15 }}><strong style={{ width: 120, display: 'inline-block' }}>نوع:</strong> 
                {selectedCustomer.type === 'customer' ? '👤 مشتری عادی' : '🤝 همکار'}
                <button 
                  onClick={() => handleChangeCustomerType(selectedCustomer.id, selectedCustomer.type === 'customer' ? 'partner' : 'customer')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: 10, fontSize: 18 }}
                  title="تغییر نوع کاربری"
                >
                  🔄
                </button>
              </p>
              <p style={{ fontSize: 16, marginBottom: 15 }}><strong style={{ width: 120, display: 'inline-block' }}>وضعیت:</strong> 
                <span style={{ color: selectedCustomer.is_active ? '#27ae60' : '#e74c3c' }}>
                  {selectedCustomer.is_active ? '✅ فعال' : '🔒 غیرفعال'}
                </span>
                <button 
                  onClick={() => handleToggleActive(selectedCustomer.id, selectedCustomer.is_active)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: 10, fontSize: 18 }}
                  title={selectedCustomer.is_active ? 'مسدود کردن کاربر' : 'رفع مسدودی کاربر'}
                >
                  {selectedCustomer.is_active ? '🔒' : '✅'}
                </button>
              </p>
              <p style={{ fontSize: 16, marginBottom: 25 }}><strong style={{ width: 120, display: 'inline-block' }}>شهر:</strong> {selectedCustomer.city || '—'}</p>
              <p style={{ fontSize: 16, marginBottom: 25 }}><strong style={{ width: 120, display: 'inline-block' }}>مانده حساب:</strong> <span style={{ color: '#1c7385', fontWeight: 'bold' }}>۰ تومان</span></p>
              <p style={{ fontSize: 16, marginBottom: 25 }}><strong style={{ width: 120, display: 'inline-block' }}>تاریخ ثبت:</strong> {new Date(selectedCustomer.created_at).toLocaleDateString('fa-IR')}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button className="btn-secondary" style={{ padding: '10px 24px', fontSize: 15, borderRadius: 30 }} onClick={() => setShowCustomerModal(false)}>بستن</button>
              </div>
            </div>
          </div>
        )}

        {/* جدول لیست مشتریان */}
        <div className="table-container" style={{ 
          background: 'white', 
          borderRadius: 24, 
          overflow: 'hidden', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #e3dede'
        }}>
          <table className="products-table" style={{ width: '100%', fontSize: 16, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f4f7', borderBottom: '2px solid #e3dede' }}>
                <th style={{ padding: '18px 15px', fontSize: 18, textAlign: 'right' }}>نام مشتری</th>
                <th style={{ padding: '18px 15px', fontSize: 18, textAlign: 'right' }}>شماره تماس</th>
                <th style={{ padding: '18px 15px', fontSize: 18, textAlign: 'right' }}>شهر</th>
                <th style={{ padding: '18px 15px', fontSize: 18, textAlign: 'right' }}>نوع مشتری</th>
                <th style={{ padding: '18px 15px', fontSize: 18, textAlign: 'right' }}>وضعیت</th>
                <th style={{ padding: '18px 15px', fontSize: 18, textAlign: 'right' }}>مانده حساب</th>
                <th style={{ padding: '18px 15px', fontSize: 18, textAlign: 'center' }}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {customersList.map(customer => {
                // محاسبه مانده حساب (برای نمونه - باید از دیتابیس محاسبه شود)
                const balance = 0;
                
                return (
                  <tr key={customer.id} style={{ borderBottom: '1px solid #e3dede' }}>
                    <td style={{ padding: '16px 15px', fontSize: 16 }}>{customer.name || '---'}</td>
                    <td style={{ padding: '16px 15px', fontSize: 16 }}>{customer.mobile}</td>
                    <td style={{ padding: '16px 15px', fontSize: 16 }}>{customer.city || '—'}</td>
                    <td style={{ padding: '16px 15px', fontSize: 16 }}>
                      {customer.type === 'customer' ? '👤 مشتری عادی' : '🤝 همکار'}
                    </td>
                    <td style={{ padding: '16px 15px', fontSize: 16 }}>
                      <span style={{ color: customer.is_active ? '#27ae60' : '#e74c3c' }}>
                        {customer.is_active ? '✅ فعال' : '🔒 غیرفعال'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 15px', fontSize: 16, color: '#1c7385', fontWeight: 'bold' }}>
                      {balance.toLocaleString()} تومان
                    </td>
                    <td style={{ padding: '16px 15px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to={`/admin/customer/${customer.id}`}>
                          <button 
                            style={{ 
                              background: '#1c7385', 
                              color: 'white', 
                              border: 'none', 
                              padding: '8px 16px', 
                              borderRadius: 30, 
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 'bold'
                            }}
                          >
                            👤 مشاهده پروفایل
                          </button>
                        </Link>
                        <button 
                          className="delete-btn" 
                          onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                          style={{ 
                            background: '#a70023', 
                            color: 'white', 
                            border: 'none', 
                            padding: '8px 16px', 
                            borderRadius: 30, 
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 'bold'
                          }}
                        >
                          🗑️ حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {customersList.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 50, fontSize: 16, color: '#7c8788' }}>
                    هیچ مشتری یافت نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* مودال جزئیات مشتری با سفارشات */}
        {showCustomerDetailModal && selectedCustomerForDetail && (
          <div className="modal-overlay" onClick={() => setShowCustomerDetailModal(false)}>
            <div className="customer-detail-modal" style={{ 
              background: 'white', 
              width: '90%', 
              maxWidth: 1000, 
              borderRadius: 24, 
              padding: 30,
              maxHeight: '85vh',
              overflow: 'auto'
            }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
                <h3 style={{ margin: 0, color: '#13314c', fontSize: 26 }}>جزئیات مشتری</h3>
                <button className="close-modal" onClick={() => setShowCustomerDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: 26, cursor: 'pointer' }}>✖</button>
              </div>
              <div className="modal-body">
                <div className="customer-info" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 15, marginBottom: 30, background: '#f0f4f7', padding: 25, borderRadius: 20 }}>
                  <p style={{ margin: 0, fontSize: 16 }}><strong style={{ fontSize: 16 }}>نام:</strong> {selectedCustomerForDetail.name || '—'}</p>
                  <p style={{ margin: 0, fontSize: 16 }}><strong style={{ fontSize: 16 }}>موبایل:</strong> {selectedCustomerForDetail.mobile}</p>
                  <p style={{ margin: 0, fontSize: 16 }}><strong style={{ fontSize: 16 }}>ایمیل:</strong> {selectedCustomerForDetail.email || '—'}</p>
                  <p style={{ margin: 0, fontSize: 16 }}><strong style={{ fontSize: 16 }}>شهر:</strong> {selectedCustomerForDetail.city || '—'}</p>
                  <p style={{ margin: 0, fontSize: 16 }}><strong style={{ fontSize: 16 }}>نوع:</strong> {selectedCustomerForDetail.type === 'customer' ? '👤 مشتری عادی' : '🤝 همکار'}</p>
                  <p style={{ margin: 0, fontSize: 16 }}><strong style={{ fontSize: 16 }}>وضعیت:</strong> {selectedCustomerForDetail.is_active ? '✅ فعال' : '🔒 غیرفعال'}</p>
                  <p style={{ margin: 0, fontSize: 16 }}><strong style={{ fontSize: 16 }}>مانده حساب:</strong> <span style={{ color: '#1c7385', fontWeight: 'bold' }}>۰ تومان</span></p>
                  <p style={{ margin: 0, fontSize: 16 }}><strong style={{ fontSize: 16 }}>تاریخ عضویت:</strong> {new Date(selectedCustomerForDetail.created_at).toLocaleDateString('fa-IR')}</p>
                </div>
                <hr style={{ margin: '25px 0' }} />
                <h4 style={{ color: '#13314c', marginBottom: 20, fontSize: 22 }}>📦 لیست سفارش‌ها (پیش‌فاکتورها)</h4>
                {loadingQuotes ? (
                  <p style={{ textAlign: 'center', padding: 40, fontSize: 16 }}>در حال بارگذاری سفارش‌ها...</p>
                ) : customerQuotes.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: 40, color: '#7c8788', fontSize: 16 }}>هیچ سفارشی برای این مشتری یافت نشد.</p>
                ) : (
                  <div className="table-container" style={{ borderRadius: 16, overflow: 'hidden' }}>
                    <table className="quotes-table" style={{ width: '100%', fontSize: 15 }}>
                      <thead>
                        <tr style={{ background: '#f0f4f7' }}>
                          <th style={{ padding: '15px', textAlign: 'right', fontSize: 16 }}>شماره پیش‌فاکتور</th>
                          <th style={{ padding: '15px', textAlign: 'right', fontSize: 16 }}>تاریخ صدور</th>
                          <th style={{ padding: '15px', textAlign: 'right', fontSize: 16 }}>مبلغ کل (تومان)</th>
                          <th style={{ padding: '15px', textAlign: 'right', fontSize: 16 }}>وضعیت</th>
                          <th style={{ padding: '15px', textAlign: 'center', fontSize: 16 }}>جزئیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerQuotes.map(quote => (
                          <tr key={quote.id} style={{ borderBottom: '1px solid #e3dede' }}>
                            <td style={{ padding: '12px', fontSize: 15 }}>{quote.quote_number || `PF-${quote.id}`}</td>
                            <td style={{ padding: '12px', fontSize: 15 }}>{new Date(quote.issue_date).toLocaleDateString('fa-IR')}</td>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#1c7385', fontSize: 15 }}>{quote.total_amount?.toLocaleString() || '۰'} تومان</td>
                            <td style={{ padding: '12px' }}>
                              <span className={`status-badge status-${quote.status}`} style={{ fontSize: 13, padding: '4px 12px' }}>
                                {quote.status === 'issued' ? 'صادر شده' :
                                quote.status === 'waiting_customer' ? 'در انتظار مشتری' :
                                quote.status === 'preparing' ? 'در حال آماده‌سازی' :
                                quote.status === 'completed' ? 'تکمیل شده' :
                                quote.status === 'cancelled' ? 'لغو شده' : quote.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <button className="view-btn" onClick={() => window.open(`/quote/${quote.id}`, '_blank')} style={{ background: '#1c7385', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 30, cursor: 'pointer', fontSize: 13 }}>مشاهده</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ marginTop: 25, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setShowCustomerDetailModal(false)} style={{ padding: '10px 25px', borderRadius: 30, fontSize: 15 }}>بستن</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };


  const renderData = () => (
    <div className="data-io-view">
      <h2>ورود و خروج داده</h2>
      <p className="section-desc">انتخاب فرمت فایل برای ورود یا خروج اطلاعات محصولات.</p>
      <div className="format-selector">
        <label className={ioFormat === 'json' ? 'active' : ''}><input type="radio" value="json" checked={ioFormat === 'json'} onChange={() => setIoFormat('json')} /> JSON</label>
        <label className={ioFormat === 'csv' ? 'active' : ''}><input type="radio" value="csv" checked={ioFormat === 'csv'} onChange={() => setIoFormat('csv')} /> CSV</label>
        <label className={ioFormat === 'excel' ? 'active' : ''}><input type="radio" value="excel" checked={ioFormat === 'excel'} onChange={() => setIoFormat('excel')} /> Excel</label>
      </div>
      <div className="io-card">
        <h3>📥 ورود داده</h3>
        <div className="file-upload-row">
          <input type="file" id="file-input" accept={ioFormat === 'json' ? '.json' : ioFormat === 'csv' ? '.csv' : '.xlsx,.xls'} onChange={handleFileSelect} />
          <button className="btn-primary" onClick={handleImport}>شروع وارد کردن</button>
        </div>
        {selectedFile && <p className="selected-file">فایل انتخاب شده: {selectedFile.name}</p>}
      </div>
      <div className="io-card">
        <h3>📤 خروجی داده</h3>
        <p>دریافت فایل {ioFormat.toUpperCase()} از تمام محصولات فعلی.</p>
        <button className="btn-secondary" onClick={handleExport}>دانلود خروجی</button>
      </div>
      <div className="io-card">
        <h3>📋 قالب نمونه</h3>
        <p>دانلود یک فایل {ioFormat.toUpperCase()} نمونه با ساختار صحیح.</p>
        <button className="btn-outline" onClick={downloadTemplate}>دانلود قالب</button>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="settings-view">
      <h3>تنظیمات عمومی</h3>
      <div className="setting-group">
        <label>روش فروش:</label>
        <div className="radio-group">
          <label><input type="radio" name="salesMode" value="cart" checked={tempSalesMode === 'cart'} onChange={handleTempSalesModeChange} /> سبد خرید (افزودن به سبد)</label>
          <label><input type="radio" name="salesMode" value="contact" checked={tempSalesMode === 'contact'} onChange={handleTempSalesModeChange} /> تماس با ما (نمایش شماره)</label>
        </div>
        <button className="btn-primary" onClick={handleSaveSettings} style={{ marginTop: '15px' }}>💾 ذخیره تنظیمات</button>
      </div>
      <div className="setting-group">
        <label>انتخاب تگ‌های نمایش در صفحه اصلی (سه بخش):</label>
        <div className="landing-tags-selector">
          {[0, 1, 2].map(idx => (
            <select key={idx} value={landingTags[idx] || ''} onChange={e => { const newTags = [...landingTags]; newTags[idx] = e.target.value; setLandingTagsState(newTags); }} className="tag-select">
              <option value="">انتخاب تگ {idx + 1}</option>
              {availableTagsForSelect.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          ))}
        </div>
        <button className="btn-primary" onClick={handleSaveLandingTags} style={{ marginTop: '15px' }}>💾 ذخیره تگ‌های صفحه اصلی</button>
      </div>
      <p>بازنشانی تمام داده‌ها به حالت پیش‌فرض اولیه.</p>
      <button className="btn-primary" onClick={handleReset}>🔄 بازنشانی داده‌ها</button>
    </div>
  );

  const renderQuoteStatsPage = () => (
    <div className="quote-stats-view">
      <h2>📊 آمار پیش‌فاکتورها</h2>
      <div className="stats-grid">
        <div className="stat-card"><span className="stat-value">{quoteStats.partnerCount}</span><span>پیش‌فاکتور همکاران</span></div>
        <div className="stat-card"><span className="stat-value">{quoteStats.customerCount}</span><span>پیش‌فاکتور مشتریان عادی</span></div>
        <div className="stat-card"><span className="stat-value">{quoteStats.finalizedCount}</span><span>سفارش قطعی شده</span></div>
        <div className="stat-card"><span className="stat-value">{quoteStats.totalValue.toLocaleString()} تومان</span><span>ارزش کل سفارشات قطعی</span></div>
      </div>
    </div>
  );

  const renderMonthlyStatsPage = () => (
    <div className="monthly-stats-view">
      <h2>📈 گزارشات ماه جاری</h2>
      {monthlyStatsLoading ? <div className="loading-placeholder">در حال بارگذاری...</div> : (
        <div className="stats-grid">
          <div className="stat-card"><span className="stat-value">{monthlyCustomerCount}</span><span>مشتریان جدید در ماه جاری</span></div>
          <div className="stat-card"><span className="stat-value">{monthlyQuotesCount}</span><span>پیش‌فاکتورهای ثبت‌شده در ماه جاری</span></div>
          <div className="stat-card"><span className="stat-value">{monthlyTotalAmount.toLocaleString()} تومان</span><span>ارزش کل سفارشات ماه جاری</span></div>
        </div>
      )}
    </div>
  );

  // ==================== کارشناسان ====================
  const handleAddExpert = async () => {
    if (!expertForm.name || !expertForm.phone) { alert('نام و شماره تماس الزامی است'); return; }
    try {
      const res = await fetch('/api/experts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expertForm)
      });
      const data = await res.json();
      if (data.success) { setExpertForm({ name: '', phone: '', photo: '', is_active: true }); loadExperts(); }
      else alert(data.error);
    } catch (err) { console.error(err); }
  };

  const handleUpdateExpert = async () => {
    if (!editingExpertId) return;
    try {
      const res = await fetch(`/api/experts/${editingExpertId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expertForm)
      });
      const data = await res.json();
      if (data.success) {
        setEditingExpertId(null);
        setExpertForm({ name: '', phone: '', photo: '', is_active: true });
        loadExperts();
      } else alert(data.error);
    } catch (err) { console.error(err); }
  };

  const handleDeleteExpert = async (id) => {
    if (window.confirm('حذف این کارشناس؟')) {
      try { await fetch(`/api/experts/${id}`, { method: 'DELETE' }); loadExperts(); }
      catch (err) { console.error(err); }
    }
  };

  const startEditExpert = (expert) => {
    setEditingExpertId(expert.id);
    setExpertForm({ name: expert.name, phone: expert.phone, photo: expert.photo || '', is_active: expert.is_active });
  };

  // ==================== تابع رندر درخواست‌های مشاهده قیمت ====================
  const renderPriceRequests = () => (
    <div className="partners-view">
      <h2>📱 درخواست‌های مشاهده قیمت</h2>
      {loadingPriceRequests ? <p>در حال بارگذاری...</p> : (
        priceRequests.length === 0 ? <p>هیچ درخواستی ثبت نشده است.</p> :
        <div className="table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th>شناسه</th>
                <th>محصول</th>
                <th>شماره موبایل</th>
                <th>تاریخ درخواست</th>
              </tr>
            </thead>
            <tbody>
              {priceRequests.map(req => (
                <tr key={req.id}>
                  <td>{req.id}</td>
                  <td>{req.product_name || `محصول ${req.product_id}`}</td>
                  <td>{req.mobile}</td>
                  <td>{new Date(req.created_at).toLocaleDateString('fa-IR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ==================== تابع رندر مدیریت سفارشات ====================
  const renderManageQuotes = () => {
    // اطمینان از اینکه allQuotes همیشه آرایه است
    const quotesList = Array.isArray(allQuotes) ? allQuotes : [];
    
    return (
      <div className="manage-quotes-view">
        {/* هدر صفحه */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 25,
          flexWrap: 'wrap',
          gap: 15
        }}>
          <div>
            <h2 style={{ color: '#13314c', margin: 0, fontSize: 28 }}>📋 مدیریت سفارشات</h2>
            <p style={{ color: '#7c8788', margin: '8px 0 0 0', fontSize: 14 }}>
              مشاهده و مدیریت تمام سفارشات ثبت شده در سیستم
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontWeight: 'bold', color: '#13314c' }}>فیلتر وضعیت:</label>
              <select 
                value={quoteStatusFilter} 
                onChange={e => { 
                  setQuoteStatusFilter(e.target.value); 
                  setTimeout(loadAllQuotes, 100); 
                }}
                style={{ 
                  padding: '10px 18px', 
                  borderRadius: 30, 
                  border: '1px solid #e3dede',
                  background: 'white',
                  fontSize: 14,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">همه سفارشات</option>
                <option value="submitted">ثبت شده</option>
                <option value="reviewing">در حال بررسی</option>
                <option value="issued">صادر شده</option>
                <option value="preparing">در حال آماده‌سازی</option>
                <option value="completed">تکمیل شده</option>
                <option value="cancelled">لغو شده</option>
              </select>
            </div>
            
            <button 
              className="btn-secondary" 
              onClick={loadAllQuotes}
              style={{ 
                padding: '10px 20px', 
                borderRadius: 30, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              🔄 بارگذاری مجدد
            </button>
          </div>
        </div>

        {loadingAllQuotes ? (
          <div style={{ textAlign: 'center', padding: 80, background: 'white', borderRadius: 24 }}>
            <div style={{ 
              width: 50, 
              height: 50, 
              border: '4px solid #e3dede', 
              borderTopColor: '#1c7385', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <p style={{ fontSize: 16, color: '#7c8788' }}>در حال بارگذاری سفارشات...</p>
          </div>
        ) : quotesList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, background: 'white', borderRadius: 24, border: '1px solid #e3dede' }}>
            <div style={{ fontSize: 48, marginBottom: 15 }}>📭</div>
            <p style={{ fontSize: 16, color: '#7c8788' }}>هیچ سفارشی یافت نشد.</p>
          </div>
        ) : (
          <div className="table-container" style={{ 
            background: 'white', 
            borderRadius: 24, 
            overflow: 'hidden', 
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            border: '1px solid #e3dede'
          }}>
            <table className="products-table" style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f4f7', borderBottom: '2px solid #e3dede' }}>
                  <th style={{ padding: '16px 15px', textAlign: 'right', fontSize: 16 }}>شماره سفارش</th>
                  <th style={{ padding: '16px 15px', textAlign: 'right', fontSize: 16 }}>تاریخ ثبت</th>
                  <th style={{ padding: '16px 15px', textAlign: 'right', fontSize: 16 }}>شناسه همکار</th>
                  <th style={{ padding: '16px 15px', textAlign: 'right', fontSize: 16 }}>مبلغ کل (تومان)</th>
                  <th style={{ padding: '16px 15px', textAlign: 'right', fontSize: 16 }}>وضعیت</th>
                  <th style={{ padding: '16px 15px', textAlign: 'center', fontSize: 16 }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {quotesList.map(quote => {
                  const getStatusInfo = (status) => {
                    const statusMap = {
                      submitted: { label: 'ثبت شده', color: '#1976d2', bg: '#e3f2fd' },
                      reviewing: { label: 'در حال بررسی', color: '#f57c00', bg: '#fff3e0' },
                      issued: { label: 'صادر شده', color: '#388e3c', bg: '#e8f5e9' },
                      preparing: { label: 'در حال آماده‌سازی', color: '#7b1fa2', bg: '#f3e5f5' },
                      completed: { label: 'تکمیل شده', color: '#00796b', bg: '#e0f2f1' },
                      price_inquiry: { label: 'نیاز به تماس جهت اعلام قیمت', color: '#e67e22', bg: '#fff3e0' },
                      cancelled: { label: 'لغو شده', color: '#d32f2f', bg: '#ffebee' }
                    };
                    return statusMap[status] || { label: status, color: '#666', bg: '#f5f5f5' };
                  };
                  const statusInfo = getStatusInfo(quote.status);
                  
                  return (
                    <tr key={quote.id} style={{ borderBottom: '1px solid #e3dede' }}>
                      <td style={{ padding: '14px 15px', fontWeight: 'bold', color: '#1c7385' }}>
                        {quote.quote_number}
                      </td>
                      <td style={{ padding: '14px 15px' }}>
                        {new Date(quote.created_at).toLocaleDateString('fa-IR')}
                      </td>
                      <td style={{ padding: '14px 15px' }}>
                        {quote.partner_id || '—'}
                      </td>
                      <td style={{ padding: '14px 15px', fontWeight: 'bold', fontSize: 16, color: '#1c7385' }}>
                        {quote.total_amount?.toLocaleString() || '۰'} تومان
                      </td>
                      <td style={{ padding: '14px 15px' }}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '6px 14px',
                          borderRadius: 30,
                          fontSize: 12,
                          fontWeight: 'bold',
                          background: statusInfo.bg,
                          color: statusInfo.color
                        }}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 15px', textAlign: 'center' }}>
                        {quote.status !== 'completed' && quote.status !== 'cancelled' ? (
                          <select
                            value={quote.status}
                            onChange={e => handleChangeQuoteStatus(quote.id, e.target.value)}
                            style={{ 
                              padding: '8px 12px', 
                              borderRadius: 30, 
                              border: '1px solid #ddd',
                              background: 'white',
                              fontSize: 13,
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="submitted">📋 ثبت شده</option>
                            <option value="reviewing">🔍 در حال بررسی</option>
                            <option value="issued">✅ صادر شده</option>
                            <option value="price_inquiry">📞 نیاز به تماس جهت اعلام قیمت</option>
                            <option value="preparing">⚙️ در حال آماده‌سازی</option>
                            <option value="completed">🎉 تکمیل شده</option>
                            <option value="cancelled">❌ لغو شده</option>
                          </select>
                        ) : (
                          <span style={{ color: '#7c8788', fontSize: 13 }}>
                            {quote.status === 'completed' ? '✓ نهایی شده' : '✗ بسته شده'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderExperts = () => {
    const handleSubmit = async () => {
      if (!supportFormData.name || !supportFormData.phone) {
        alert('نام و شماره تماس الزامی است');
        return;
      }
      
      try {
        let res;
        if (editingSupportId) {
          res = await fetch(`/api/experts/${editingSupportId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(supportFormData)
          });
        } else {
          res = await fetch('/api/experts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(supportFormData)
          });
        }
        
        const data = await res.json();
        if (data.success) {
          alert(editingSupportId ? 'پشتیبان با موفقیت ویرایش شد' : 'پشتیبان با موفقیت اضافه شد');
          setShowSupportForm(false);
          setEditingSupportId(null);
          setSupportFormData({ name: '', phone: '', photo: '', is_active: true, department: 'فروش', order_priority: 1 });
          loadSupportAgents();
        } else {
          alert(data.error);
        }
      } catch (err) {
        console.error(err);
        alert('خطا در ذخیره اطلاعات');
      }
    };

    const handleDelete = async (id) => {
      if (window.confirm('آیا از حذف این پشتیبان اطمینان دارید؟')) {
        try {
          const res = await fetch(`/api/experts/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            alert('پشتیبان با موفقیت حذف شد');
            loadSupportAgents();
          } else {
            alert(data.error);
          }
        } catch (err) {
          console.error(err);
          alert('خطا در حذف پشتیبان');
        }
      }
    };

    const handleEdit = (agent) => {
      setEditingSupportId(agent.id);
      setSupportFormData({
        name: agent.name,
        phone: agent.phone,
        photo: agent.photo || '',
        is_active: agent.is_active === 1,
        department: agent.department || 'فروش',
        order_priority: agent.order_priority || 1
      });
      setShowSupportForm(true);
    };

    const toggleStatus = async (id, currentStatus) => {
      try {
        const res = await fetch(`/api/experts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: currentStatus ? 0 : 1 })
        });
        const data = await res.json();
        if (data.success) {
          loadSupportAgents();
        } else {
          alert(data.error);
        }
      } catch (err) {
        console.error(err);
        alert('خطا در تغییر وضعیت');
      }
    };

    const filteredAgents = supportAgents.filter(agent =>
      agent.name?.toLowerCase().includes(supportSearchTerm.toLowerCase()) ||
      agent.phone?.includes(supportSearchTerm)
    );

    return (
      <div className="support-agents-view">
        {/* هدر صفحه */}
        <div className="page-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 30,
          flexWrap: 'wrap',
          gap: 15
        }}>
          <div>
            <h2 style={{ color: '#13314c', margin: 0, fontSize: 28 }}>👨‍💼 مدیریت پشتیبانان فروش</h2>
            <p style={{ color: '#7c8788', margin: '8px 0 0 0', fontSize: 14 }}>
              مدیریت کارشناسان پشتیبانی و ارتباط با مشتریان
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              background: 'white', 
              border: '2px solid #e3dede', 
              borderRadius: 40, 
              padding: '5px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <input 
                type="text" 
                placeholder="جستجوی نام یا شماره..." 
                value={supportSearchTerm}
                onChange={e => setSupportSearchTerm(e.target.value)}
                style={{ 
                  border: 'none', 
                  outline: 'none', 
                  padding: '10px 18px', 
                  borderRadius: 40, 
                  width: 250,
                  fontSize: 14,
                  fontFamily: 'inherit'
                }}
              />
              <button style={{ 
                background: '#1c7385', 
                border: 'none', 
                color: 'white', 
                width: 42, 
                height: 42, 
                borderRadius: '50%', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18
              }}>🔍</button>
            </div>
            
            <button 
              className="btn-primary" 
              onClick={() => {
                setEditingSupportId(null);
                setSupportFormData({ name: '', phone: '', photo: '', is_active: true, department: 'فروش', order_priority: 1 });
                setShowSupportForm(true);
              }}
              style={{ 
                padding: '10px 24px', 
                fontSize: 15,
                borderRadius: 40,
                background: '#1c7385',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              ➕ افزودن پشتیبان جدید
            </button>
          </div>
        </div>

        {/* فرم افزودن/ویرایش */}
        {showSupportForm && (
          <div className="modal-overlay" onClick={() => setShowSupportForm(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
              background: 'white', 
              padding: 30, 
              borderRadius: 24, 
              maxWidth: 550, 
              width: '90%'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
                <h3 style={{ margin: 0, color: '#13314c', fontSize: 22 }}>
                  {editingSupportId ? '✏️ ویرایش پشتیبان' : '➕ افزودن پشتیبان جدید'}
                </h3>
                <button onClick={() => setShowSupportForm(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>✖</button>
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#13314c' }}>نام کامل *</label>
                <input
                  type="text"
                  placeholder="مثال: علی رضایی"
                  value={supportFormData.name}
                  onChange={e => setSupportFormData({ ...supportFormData, name: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #ddd', fontSize: 14 }}
                />
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#13314c' }}>شماره تماس *</label>
                <input
                  type="tel"
                  placeholder="مثال: 09123456789"
                  value={supportFormData.phone}
                  onChange={e => setSupportFormData({ ...supportFormData, phone: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #ddd', fontSize: 14 }}
                />
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#13314c' }}>بخش / تخصص</label>
                <select
                  value={supportFormData.department}
                  onChange={e => setSupportFormData({ ...supportFormData, department: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #ddd', fontSize: 14 }}
                >
                  <option value="فروش">فروش</option>
                  <option value="پشتیبانی">پشتیبانی</option>
                  <option value="مشاوره فنی">مشاوره فنی</option>
                  <option value="حمل و نقل">حمل و نقل</option>
                </select>
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#13314c' }}>آدرس عکس (اختیاری)</label>
                <input
                  type="text"
                  placeholder="مثال: /images/experts/ali.jpg"
                  value={supportFormData.photo}
                  onChange={e => setSupportFormData({ ...supportFormData, photo: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #ddd', fontSize: 14 }}
                />
              </div>
              
              <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={supportFormData.is_active}
                    onChange={e => setSupportFormData({ ...supportFormData, is_active: e.target.checked })}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <span style={{ color: '#13314c' }}>فعال</span>
                </label>
                
                <div>
                  <label style={{ marginLeft: 10, fontWeight: 'bold', color: '#13314c' }}>اولویت نمایش:</label>
                  <select
                    value={supportFormData.order_priority}
                    onChange={e => setSupportFormData({ ...supportFormData, order_priority: parseInt(e.target.value) })}
                    style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', marginRight: 10 }}
                  >
                    <option value={1}>۱ - اولویت بالا</option>
                    <option value={2}>۲ - اولویت متوسط</option>
                    <option value={3}>۳ - اولویت عادی</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 15, justifyContent: 'flex-end', marginTop: 10 }}>
                <button className="btn-secondary" onClick={() => setShowSupportForm(false)} style={{ padding: '10px 24px', borderRadius: 30 }}>انصراف</button>
                <button className="btn-primary" onClick={handleSubmit} style={{ padding: '10px 24px', borderRadius: 30 }}>ذخیره</button>
              </div>
            </div>
          </div>
        )}

        {/* لیست پشتیبانان */}
        {loadingSupportAgents ? (
          <div style={{ textAlign: 'center', padding: 50 }}>در حال بارگذاری...</div>
        ) : filteredAgents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 24, border: '1px solid #e3dede' }}>
            <div style={{ fontSize: 48, marginBottom: 15 }}>👨‍💼</div>
            <p style={{ fontSize: 16, color: '#7c8788' }}>هیچ پشتیبان فروشی ثبت نشده است.</p>
            <button 
              className="btn-primary" 
              onClick={() => {
                setEditingSupportId(null);
                setSupportFormData({ name: '', phone: '', photo: '', is_active: true, department: 'فروش', order_priority: 1 });
                setShowSupportForm(true);
              }}
              style={{ marginTop: 20, padding: '10px 24px', borderRadius: 30 }}
            >
              ➕ افزودن اولین پشتیبان
            </button>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: 25,
            marginTop: 10
          }}>
            {filteredAgents.map(agent => (
              <div key={agent.id} style={{ 
                background: 'white', 
                borderRadius: 20, 
                border: `2px solid ${agent.is_active ? '#e8f5e9' : '#ffebee'}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
              }}
              >
                {/* نشان فعال/غیرفعال */}
                <div style={{
                  position: 'absolute',
                  top: 15,
                  left: 15,
                  background: agent.is_active ? '#27ae60' : '#e74c3c',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 30,
                  fontSize: 11,
                  fontWeight: 'bold',
                  zIndex: 1
                }}>
                  {agent.is_active ? '✅ فعال' : '❌ غیرفعال'}
                </div>
                
                {/* محتوای کارت */}
                <div style={{ padding: 25, textAlign: 'center' }}>
                  {/* آواتار */}
                  <div style={{ marginBottom: 15 }}>
                    {agent.photo ? (
                      <img 
                        src={agent.photo} 
                        alt={agent.name} 
                        style={{ 
                          width: 90, 
                          height: 90, 
                          borderRadius: '50%', 
                          objectFit: 'cover',
                          border: '3px solid #ffd800'
                        }} 
                      />
                    ) : (
                      <div style={{ 
                        width: 90, 
                        height: 90, 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #13314c 0%, #1c7385 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto'
                      }}>
                        <span style={{ fontSize: 48, color: 'white' }}>👤</span>
                      </div>
                    )}
                  </div>
                  
                  {/* اطلاعات */}
                  <h3 style={{ margin: '0 0 5px 0', color: '#13314c', fontSize: 20 }}>{agent.name}</h3>
                  
                  <div style={{ 
                    background: '#f0f4f7', 
                    borderRadius: 12, 
                    padding: '10px 15px', 
                    margin: '15px 0',
                    textAlign: 'right'
                  }}>
                    <p style={{ margin: '5px 0', fontSize: 14 }}>
                      <strong style={{ width: 90, display: 'inline-block' }}>📞 شماره تماس:</strong>
                      <span dir="ltr" style={{ color: '#1c7385' }}>{agent.phone}</span>
                    </p>
                    <p style={{ margin: '5px 0', fontSize: 14 }}>
                      <strong style={{ width: 90, display: 'inline-block' }}>🏢 بخش:</strong>
                      {agent.department || 'فروش'}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: 14 }}>
                      <strong style={{ width: 90, display: 'inline-block' }}>📅 تاریخ ثبت:</strong>
                      {new Date(agent.created_at).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                  
                  {/* دکمه‌های عملیات */}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
                    <button 
                      onClick={() => handleEdit(agent)}
                      style={{ 
                        background: '#1c7385', 
                        color: 'white', 
                        border: 'none', 
                        padding: '8px 20px', 
                        borderRadius: 30, 
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      ✏️ ویرایش
                    </button>
                    <button 
                      onClick={() => toggleStatus(agent.id, agent.is_active)}
                      style={{ 
                        background: agent.is_active ? '#f57c00' : '#27ae60', 
                        color: 'white', 
                        border: 'none', 
                        padding: '8px 20px', 
                        borderRadius: 30, 
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {agent.is_active ? '🔒 غیرفعال' : '✅ فعال'}
                    </button>
                    <button 
                      onClick={() => handleDelete(agent.id)}
                      style={{ 
                        background: '#a70023', 
                        color: 'white', 
                        border: 'none', 
                        padding: '8px 20px', 
                        borderRadius: 30, 
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* آمار پایین صفحه */}
        {!loadingSupportAgents && filteredAgents.length > 0 && (
          <div style={{ 
            marginTop: 30, 
            padding: '15px 20px', 
            background: '#f0f4f7', 
            borderRadius: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 15
          }}>
            <span>📊 <strong>جمع پشتیبانان:</strong> {filteredAgents.length} نفر</span>
            <span>✅ <strong>فعال:</strong> {filteredAgents.filter(a => a.is_active).length} نفر</span>
            <span>❌ <strong>غیرفعال:</strong> {filteredAgents.filter(a => !a.is_active).length} نفر</span>
          </div>
        )}
      </div>
    );
  };


  // ========== مدیریت دسترسی‌ها (Permissions) ==========
  const [roles, setRoles] = useState([]);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editingPermissions, setEditingPermissions] = useState([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [allPermissionsList] = useState([
    { key: 'view_dashboard', label: 'مشاهده داشبورد', group: 'داشبورد' },
    { key: 'view_products', label: 'مشاهده محصولات', group: 'محصولات' },
    { key: 'add_product', label: 'افزودن محصول', group: 'محصولات' },
    { key: 'edit_product', label: 'ویرایش محصول', group: 'محصولات' },
    { key: 'delete_product', label: 'حذف محصول', group: 'محصولات' },
    { key: 'manage_brands', label: 'مدیریت برندها', group: 'برندها' },
    { key: 'manage_tags', label: 'مدیریت تگ‌ها', group: 'تگ‌ها' },
    { key: 'manage_partners', label: 'مدیریت همکاران', group: 'همکاران' },
    { key: 'manage_employees', label: 'مدیریت کارمندان', group: 'کارمندان' },
    { key: 'import_export', label: 'ورود و خروج داده', group: 'داده‌ها' },
    { key: 'view_quotes', label: 'مشاهده سفارشات', group: 'سفارشات' },
    { key: 'create_quote', label: 'ایجاد سفارش', group: 'سفارشات' },
    { key: 'manage_quotes', label: 'مدیریت سفارشات', group: 'سفارشات' },
    { key: 'view_reports', label: 'مشاهده گزارشات', group: 'گزارشات' },
    { key: 'edit_sales_mode', label: 'تغییر روش فروش', group: 'تنظیمات' },
    { key: 'edit_landing_tags', label: 'تغییر تگ‌های صفحه اصلی', group: 'تنظیمات' }
  ]);

  const loadRoles = async () => {
    try {
      const res = await fetch('/api/employees/roles');
      const data = await res.json();
      if (data.success) setRoles(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const updateRolePermissions = async (roleId, permissions) => {
    try {
      const res = await fetch(`/api/employees/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions })
      });
      const data = await res.json();
      if (data.success) {
        alert('دسترسی‌ها با موفقیت ذخیره شد');
        loadRoles();
        setEditingRoleId(null);
        setShowRoleModal(false);
      } else {
        alert('خطا: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('خطا در ذخیره دسترسی‌ها');
    }
  };

  const openEditBrand = (brand) => {
    setEditingBrandId(brand.id);
    setBrandFormData({
      name: brand.name || '',
      logo: brand.logo || '',
      address: brand.address || '',
      description: brand.description || '',
      website: brand.website || '',
      phone: brand.phone || '',
      email: brand.email || '',
      enabled: brand.enabled === 1
    });
    if (brand.logo) {
      setBrandLogoPreview(brand.logo.startsWith('http') ? brand.logo : `${brand.logo}`);
    } else {
      setBrandLogoPreview('');
    }
    setShowBrandForm(true);
  };
  const openEditPermissions = (role) => {
    setEditingRoleId(role.id);
    setEditingPermissions(role.permissions || []);
    setShowRoleModal(true);
  };

  const togglePermission = (permKey) => {
    setEditingPermissions(prev => 
      prev.includes(permKey) 
        ? prev.filter(p => p !== permKey)
        : [...prev, permKey]
    );
  };




  // ==================== رندر داشبورد ====================
const renderDashboard = () => {
  return (
    <div className="dashboard-view">
      {loadingDashboard ? (
        <div style={{ textAlign: 'center', padding: 40 }}>⏳ در حال بارگذاری آمار...</div>
      ) : (
        <>
          {/* کارت‌های اصلی فروش */}
          <div className="stats-grid" style={{ marginBottom: 25 }}>
            <div 
              className="stat-card clickable" 
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', cursor: 'pointer' }}
              onClick={() => loadReportData('today')}
            >
              <div style={{ fontSize: 14, opacity: 0.9 }}>💰 فروش امروز</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', margin: '10px 0' }}>
                {dashboardStats.todaySales.toLocaleString()} تومان
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{dashboardStats.newOrders} سفارش جدید</div>
            </div>

            <div 
              className="stat-card clickable" 
              style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', cursor: 'pointer' }}
              onClick={() => loadReportData('month')}
            >
              <div style={{ fontSize: 14, opacity: 0.9 }}>📊 فروش این ماه</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', margin: '10px 0' }}>
                {dashboardStats.monthSales.toLocaleString()} تومان
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>میانگین: {dashboardStats.financialStatus.averageOrderValue.toLocaleString()} تومان</div>
            </div>

            <div 
              className="stat-card clickable" 
              style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', cursor: 'pointer' }}
              onClick={() => loadReportData('year')}
            >
              <div style={{ fontSize: 14, opacity: 0.9 }}>📈 فروش سال</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', margin: '10px 0' }}>
                {dashboardStats.yearSales.toLocaleString()} تومان
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{quoteStats.total} کل سفارشات</div>
            </div>
          </div>

          {/* کارت‌های وضعیت */}
          <div className="stats-grid" style={{ marginBottom: 25 }}>
            <div className="stat-card clickable" onClick={loadCustomerStats}>
              <span style={{ fontSize: 40 }}>👥</span>
              <span className="stat-value" style={{ color: '#3498db' }}>{customerStatsData.today}</span>
              <span>مشتریان جدید</span>
              <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                امروز: {customerStatsData.today} | هفته: {customerStatsData.week} | ماه: {customerStatsData.month}
              </div>
            </div>

            <div className="stat-card clickable" onClick={loadOrderStatus}>
              <span style={{ fontSize: 40 }}>📦</span>
              <span className="stat-value" style={{ color: '#e67e22' }}>{allQuotes.filter(q => q.status === 'submitted' || q.status === 'reviewing').length}</span>
              <span>وضعیت سفارش‌ها</span>
              <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>
                در انتظار: {allQuotes.filter(q => q.status === 'submitted' || q.status === 'reviewing').length}
              </div>
            </div>

            <div className="stat-card clickable" onClick={() => setActiveMenu('employees')}>
              <span style={{ fontSize: 40 }}>👨‍💼</span>
              <span className="stat-value" style={{ color: '#27ae60' }}>{employees.length}</span>
              <span>کارمندان</span>
              <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>
                {employees.filter(e => e.is_active !== false).length} فعال
              </div>
            </div>
          </div>

          {/* نمودارهای فروش */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: 25,
            marginBottom: 25
          }}>
            <div style={{ background: 'white', borderRadius: 20, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' }}>
              <h3 style={{ color: '#13314c', marginTop: 0, marginBottom: 20, textAlign: 'center' }}>📊 فروش ۷ روز اخیر</h3>
              {loadingChart ? (
                <div style={{ textAlign: 'center', padding: 50 }}>در حال بارگذاری...</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => (value / 1000).toFixed(0) + 'k'} />
                    <Tooltip formatter={(value) => `${value.toLocaleString()} تومان`} />
                    <Legend />
                    <Bar dataKey="فروش" fill="#1c7385" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            
            <div style={{ background: 'white', borderRadius: 20, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' }}>
              <h3 style={{ color: '#13314c', marginTop: 0, marginBottom: 20, textAlign: 'center' }}>📈 فروش ۶ ماه اخیر</h3>
              {loadingChart ? (
                <div style={{ textAlign: 'center', padding: 50 }}>در حال بارگذاری...</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlySalesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => (value / 1000).toFixed(0) + 'k'} />
                    <Tooltip formatter={(value) => `${value.toLocaleString()} تومان`} />
                    <Legend />
                    <Area type="monotone" dataKey="فروش" stroke="#ffd800" fill="#ffd800" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* نمودار خطی روند فروش */}
          <div style={{ background: 'white', borderRadius: 20, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0', marginBottom: 25 }}>
            <h3 style={{ color: '#13314c', marginTop: 0, marginBottom: 20, textAlign: 'center' }}>📉 روند فروش و تعداد سفارش‌ها</h3>
            {loadingChart ? (
              <div style={{ textAlign: 'center', padding: 50 }}>در حال بارگذاری...</div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthlySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" tickFormatter={(value) => (value / 1000).toFixed(0) + 'k'} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value, name) => {
                    if (name === 'فروش') return `${value.toLocaleString()} تومان`;
                    return `${value} سفارش`;
                  }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="فروش" stroke="#1c7385" strokeWidth={3} dot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="تعداد" stroke="#e67e22" strokeWidth={3} dot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* وضعیت مالی */}
          <div style={{ background: 'white', borderRadius: 20, padding: 25, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' }}>
            <h3 style={{ color: '#13314c', marginTop: 0, marginBottom: 20 }}>💳 وضعیت مالی</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#666' }}>درآمد کل (این ماه)</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#27ae60', marginTop: 8 }}>
                  {dashboardStats.financialStatus.totalIncome.toLocaleString()} تومان
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#666' }}>مبلغ در انتظار</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#e67e22', marginTop: 8 }}>
                  {dashboardStats.financialStatus.totalPending.toLocaleString()} تومان
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#666' }}>میانگین ارزش سفارش</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#3498db', marginTop: 8 }}>
                  {dashboardStats.financialStatus.averageOrderValue.toLocaleString()} تومان
                </div>
              </div>
            </div>
          </div>

          {/* لینک‌های سریع */}
          <div style={{ marginTop: 25, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 15 }}>
            <button className="btn-primary" onClick={() => setActiveMenu('manage-quotes')} style={{ padding: '12px' }}>📋 مدیریت سفارشات</button>
            <button className="btn-primary" onClick={() => setActiveMenu('products')} style={{ padding: '12px' }}>🧱 محصولات</button>
            <button className="btn-primary" onClick={() => setActiveMenu('customers')} style={{ padding: '12px' }}>👥 مشتریان</button>
            <button className="btn-primary" onClick={() => setActiveMenu('invoices')} style={{ padding: '12px' }}>📄 پیش‌فاکتورها</button>
          </div>
        </>
      )}
    </div>
  );
};


// ==================== رندر آمار خرید مشتریان ====================
const renderStatsPurchases = () => {
  return (
    <div className="stats-purchases-view">
      <h2 style={{ color: '#13314c', fontSize: 28, marginBottom: 20 }}>🛒 آمار خرید مشتریان</h2>
      <p style={{ textAlign: 'center', padding: 50, color: '#7c8788' }}>این بخش در حال توسعه است. به زودی کارت‌های آماری و نمودارهای خرید نمایش داده خواهند شد.</p>
    </div>
  );
};

  // مودال نمایش گزارش فروش
const renderReportModal = () => {
  if (!showReportModal) return null;
  
  const getStatusLabel = (status) => {
    const map = {
      submitted: 'ثبت شده',
      reviewing: 'در حال بررسی',
      issued: 'صادر شده',
      preparing: 'در حال آماده‌سازی',
      completed: 'تکمیل شده',
      cancelled: 'لغو شده'
    };
    return map[status] || status;
  };
  
  return (
    <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
        background: 'white', 
        padding: 25, 
        borderRadius: 20, 
        maxWidth: 900, 
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        margin: 'auto',
        marginTop: '5%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: '#13314c' }}>{reportTitle}</h3>
          <button onClick={() => setShowReportModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>✖</button>
        </div>
        
        {loadingReport ? (
          <p style={{ textAlign: 'center', padding: 40 }}>در حال بارگذاری...</p>
        ) : (
          <>
            {/* خلاصه آمار */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: 20, 
              marginBottom: 25,
              background: '#f0f4f7',
              padding: 20,
              borderRadius: 16
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#666' }}>مبلغ کل فروش</div>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1c7385' }}>
                  {reportData.totalAmount.toLocaleString()} تومان
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#666' }}>تعداد کل سفارش‌ها</div>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1c7385' }}>
                  {reportData.totalOrders}
                </div>
              </div>
            </div>
            
            {/* لیست سفارش‌ها */}
            <h4 style={{ color: '#13314c', marginBottom: 15 }}>📋 لیست سفارش‌ها</h4>
            {reportData.orders.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 30, color: '#7c8788' }}>هیچ سفارشی در این بازه یافت نشد.</p>
            ) : (
              <div className="table-container">
                <table className="products-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>شماره سفارش</th>
                      <th>نام مشتری</th>
                      <th>شهر</th>
                      <th>مبلغ (تومان)</th>
                      <th>تاریخ ثبت</th>
                      <th>وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.orders.map(order => (
                      <tr key={order.id}>
                        <td>{order.quote_number}</td>
                        <td>{order.customer_name}</td>
                        <td>{order.city}</td>
                        <td style={{ fontWeight: 'bold', color: '#1c7385' }}>{order.total_amount.toLocaleString()}</td>
                        <td>{new Date(order.created_at).toLocaleDateString('fa-IR')}</td>
                        <td>
                          <span className={`status-badge status-${order.status}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => setShowReportModal(false)} style={{ padding: '10px 25px' }}>
                بستن
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
  // ==================== MAIN RENDER ====================
  return (
    <div className="admin-layout">
    <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} style={{ position: 'relative' }}>
      <button 
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        style={{
          position: 'absolute',
          left: '10px',
          top: '20px',
          background: 'none',
          border: 'none',
          fontSize: 20,
          cursor: 'pointer',
          color: '#ffd800',
          zIndex: 10,
          transition: 'transform 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {sidebarCollapsed ? '☰' : '◀'}
      </button>
      <div className="sidebar-header">
        <h2>پنل مدیریت</h2>
        <p>کاشی و سرامیک آسمان</p>
      </div>
      <nav className="sidebar-nav">
        {/* ========== بخش فروش (بالای همه) ========== */}
        <div className={`nav-group ${openGroups.sales ? 'open' : ''}`}>
          <button className="nav-group-header" onClick={() => toggleGroup('sales')}>
            <span className="nav-group-icon">💰</span>
            <span className="nav-group-title">فروش</span>
            <span className="nav-group-arrow">{openGroups.sales ? '▼' : '►'}</span>
          </button>
          <div className="nav-group-items">
            <button 
              className={activeMenu === 'orders-list' ? 'active' : ''} 
              onClick={() => setActiveMenu('orders-list')}
            >
              📋 لیست سفارش‌ها
            </button>
            <button className={activeMenu === 'create-quote' ? 'active' : ''} onClick={() => setActiveMenu('create-quote')}>
              📄 ثبت سفارش جدید
            </button>
            <button className={activeMenu === 'invoices' ? 'active' : ''} onClick={() => setActiveMenu('invoices')}>
              📋 لیست پیش‌فاکتورها
            </button>
            <button className={activeMenu === 'manage-quotes' ? 'active' : ''} onClick={() => setActiveMenu('manage-quotes')}>
              📊 مدیریت سفارشات
            </button>
            <button className={activeMenu === 'price-requests' ? 'active' : ''} onClick={() => setActiveMenu('price-requests')}>
              📱 درخواست‌های مشاهده قیمت
            </button>
          </div>
        </div>

        {/* ========== مدیریت محصولات ========== */}
        <div className={`nav-group ${openGroups.products ? 'open' : ''}`}>
          <button className="nav-group-header" onClick={() => toggleGroup('products')}>
            <span className="nav-group-icon">📦</span>
            <span className="nav-group-title">مدیریت محصولات</span>
            <span className="nav-group-arrow">{openGroups.products ? '▼' : '►'}</span>
          </button>
          <div className="nav-group-items">
            <button className={activeMenu === 'products' ? 'active' : ''} onClick={() => setActiveMenu('products')}>
              🧱 لیست محصولات
            </button>
            <button className={activeMenu === 'brands' ? 'active' : ''} onClick={() => setActiveMenu('brands')}>
              🏭 مدیریت کارخانه‌ها
            </button>
            <button className={activeMenu === 'tags' ? 'active' : ''} onClick={() => setActiveMenu('tags')}>
              🔖 مدیریت تگ‌ها
            </button>
            <button className={activeMenu === 'templates' ? 'active' : ''} onClick={() => setActiveMenu('templates')}>
              📋 قالب توضیحات
            </button>
            <button className={activeMenu === 'data' ? 'active' : ''} onClick={() => setActiveMenu('data')}>
              📤 ورود و خروج داده
            </button>
          </div>
        </div>

        {/* ========== مشتریان و پرسنل (جداشده از فروش) ========== */}
        <div className={`nav-group ${openGroups.customers ? 'open' : ''}`}>
          <button className="nav-group-header" onClick={() => toggleGroup('customers')}>
            <span className="nav-group-icon">👥</span>
            <span className="nav-group-title">مشتریان و پرسنل</span>
            <span className="nav-group-arrow">{openGroups.customers ? '▼' : '►'}</span>
          </button>
          <div className="nav-group-items">
            <button className={activeMenu === 'customers' ? 'active' : ''} onClick={() => setActiveMenu('customers')}>
              👥 لیست مشتریان
            </button>
            <button className={activeMenu === 'partners' ? 'active' : ''} onClick={() => setActiveMenu('partners')}>
              🤝 درخواست‌های همکاری
            </button>
            <button className={activeMenu === 'employees' ? 'active' : ''} onClick={() => setActiveMenu('employees')}>
              👨‍💼 مدیریت کارمندان
            </button>
            <Link to="/admin/permissions" className="nav-link">
              🔐 مدیریت دسترسی‌ها
            </Link>
            <button className={activeMenu === 'experts' ? 'active' : ''} onClick={() => setActiveMenu('experts')}>
              👨‍💼 مدیریت پشتیبانان فروش
            </button>
            <button className={activeMenu === 'contact' ? 'active' : ''} onClick={() => setActiveMenu('contact')}>
              📞 درخواست تماس
            </button>
          </div>
        </div>

        {/* ========== گزارشات ========== */}
        <div className={`nav-group ${openGroups.reports ? 'open' : ''}`}>
          <button className="nav-group-header" onClick={() => toggleGroup('reports')}>
            <span className="nav-group-icon">📊</span>
            <span className="nav-group-title">گزارشات</span>
            <span className="nav-group-arrow">{openGroups.reports ? '▼' : '►'}</span>
          </button>
          <div className="nav-group-items">
            <button className={activeMenu === 'stats-registration' ? 'active' : ''} onClick={() => setActiveMenu('stats-registration')}>
              📈 آمار ثبت‌نام کاربران
            </button>
            <button className={activeMenu === 'stats-purchases' ? 'active' : ''} onClick={() => setActiveMenu('stats-purchases')}>
              🛒 آمار خرید مشتریان
            </button>
            <button className={activeMenu === 'quote-stats' ? 'active' : ''} onClick={() => setActiveMenu('quote-stats')}>
              📊 آمار پیش‌فاکتورها
            </button>
            <button className={activeMenu === 'monthly-stats' ? 'active' : ''} onClick={() => setActiveMenu('monthly-stats')}>
              📈 گزارشات ماه جاری
            </button>
          </div>
        </div>

        {/* ========== مدیریت سایت ========== */}
        <div className={`nav-group ${openGroups.site ? 'open' : ''}`}>
          <button className="nav-group-header" onClick={() => toggleGroup('site')}>
            <span className="nav-group-icon">⚙️</span>
            <span className="nav-group-title">مدیریت سایت</span>
            <span className="nav-group-arrow">{openGroups.site ? '▼' : '►'}</span>
          </button>
          <div className="nav-group-items">
            <button className={activeMenu === 'blog' ? 'active' : ''} onClick={() => setActiveMenu('blog')}>
              📝 مدیریت وبلاگ
            </button>
            <button className={activeMenu === 'settings' ? 'active' : ''} onClick={() => setActiveMenu('settings')}>
              ⚙️ تنظیمات
            </button>
          </div>
        </div>
      </nav>
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          🚪 خروج
        </button>
      </div>
    </aside>

    <main className="admin-main">
      <header className="main-header-bar">
        <h1>
          {activeMenu === 'dashboard' && 'داشبورد'}
          {activeMenu === 'products' && 'لیست محصولات'}
          {activeMenu === 'brands' && 'مدیریت کارخانه‌ها'}
          {activeMenu === 'tags' && 'مدیریت تگ‌ها'}
          {activeMenu === 'templates' && 'قالب توضیحات محصولات'}
          {activeMenu === 'partners' && 'درخواست‌های همکاری'}
          {activeMenu === 'customers' && 'لیست مشتریان'}
          {activeMenu === 'employees' && 'مدیریت کارمندان'}
          {activeMenu === 'blog' && 'مدیریت وبلاگ'}
          {activeMenu === 'data' && 'ورود و خروج داده'}
          {activeMenu === 'settings' && 'تنظیمات'}
          {activeMenu === 'create-quote' && 'ثبت سفارش جدید'}
          {activeMenu === 'invoices' && 'لیست پیش‌فاکتورها'}
          {activeMenu === 'manage-quotes' && 'مدیریت سفارشات'}
          {activeMenu === 'contact' && 'درخواست تماس'}
          {activeMenu === 'price-requests' && 'درخواست‌های مشاهده قیمت'}
          {activeMenu === 'stats-registration' && 'آمار ثبت‌نام کاربران'}
          {activeMenu === 'stats-purchases' && 'آمار خرید مشتریان'}
          {activeMenu === 'quote-stats' && 'آمار پیش‌فاکتورها'}
          {activeMenu === 'permissions' && 'مدیریت دسترسی‌ها'}
          {activeMenu === 'monthly-stats' && 'گزارشات ماه جاری'}
          {activeMenu === 'experts' && 'مدیریت پشتیبانان فروش'}
        </h1>
        <div className="header-actions">
          <span>👤 نوع کاربری: ادمین سایت</span>
        </div>
      </header>

      <div className="main-content">
        {activeMenu === 'dashboard' && renderDashboard()}
        {activeMenu === 'stats-registration' && renderStatsRegistration()}
        {activeMenu === 'stats-purchases' && renderStatsPurchases()}
        {activeMenu === 'quote-stats' && renderQuoteStatsPage()}
        {activeMenu === 'monthly-stats' && renderMonthlyStatsPage()}
        {activeMenu === 'products' && renderProducts()}
        {activeMenu === 'brands' && renderBrands()}
        {activeMenu === 'tags' && renderTags()}
        {activeMenu === 'templates' && renderTemplates()}
        {activeMenu === 'partners' && renderPartners()}
        {activeMenu === 'customers' && renderCustomers()}
        {activeMenu === 'employees' && renderEmployees()}
        {activeMenu === 'blog' && renderBlog()}
        {activeMenu === 'data' && renderData()}
        {activeMenu === 'settings' && renderSettings()}
        {activeMenu === 'manage-quotes' && renderManageQuotes()}
        {activeMenu === 'price-requests' && renderPriceRequests()}
        {activeMenu === 'create-quote' && <CreateQuotePage />}
        {activeMenu === 'invoices' && <QuotesListPage />}
        {activeMenu === 'orders-list' && <AdminOrdersList />}
        {activeMenu === 'experts' && renderExperts()}
        {activeMenu === 'permissions' && renderPermissions()}
        {activeMenu === 'contact' && <ContactRequests />}
        {activeMenu === 'stats-registration' && <StatsRegistration />}
        
      </div>
    </main>

    {/* مودال‌ها */}
    {renderReportModal()}
    {renderCustomerStatsModal()}
    {renderOrderStatusModal()}
    
    {duplicateModal.isOpen && (
      <div className="modal-overlay">
        <div className="duplicate-modal">
          <h3>⚠️ کد محصول تکراری</h3>
          <p>کد <strong>«{duplicateModal.productName}»</strong> از قبل وجود دارد. چه اقدامی انجام دهم؟</p>
          <div className="modal-buttons">
            <button onClick={() => duplicateModal.onResolve('update')} className="btn-update">🔄 به‌روزرسانی قیمت و موجودی</button>
            <button onClick={() => duplicateModal.onResolve('skip')} className="btn-skip">⏭️ رد کردن</button>
            <button onClick={() => duplicateModal.onResolve('updateAll')} className="btn-update-all">✅ به‌روزرسانی همه</button>
            <button onClick={() => duplicateModal.onResolve('skipAll')} className="btn-skip-all">❌ رد کردن همه</button>
          </div>
        </div>
      </div>
    )}
  </div>
    );
};



// ==================== رندر آمار ثبت‌نام ====================
const renderStatsRegistration = () => {
  return (
    <div className="stats-registration-view">
      <h2 style={{ color: '#13314c', fontSize: 28, marginBottom: 20 }}>📈 آمار ثبت‌نام کاربران</h2>
      <div className="stats-grid">
        <div className="stat-card"><span className="stat-value">{registrationStats.today.customers}</span><span>مشتری جدید امروز</span></div>
        <div className="stat-card"><span className="stat-value">{registrationStats.today.partners}</span><span>همکار جدید امروز</span></div>
        <div className="stat-card"><span className="stat-value">{registrationStats.week.customers}</span><span>مشتریان ۷ روز گذشته</span></div>
        <div className="stat-card"><span className="stat-value">{registrationStats.week.partners}</span><span>همکاران ۷ روز گذشته</span></div>
        <div className="stat-card"><span className="stat-value">{registrationStats.month.customers}</span><span>مشتریان این ماه</span></div>
        <div className="stat-card"><span className="stat-value">{registrationStats.month.partners}</span><span>همکاران این ماه</span></div>
      </div>
      {registrationStats.daily && registrationStats.daily.length > 0 && (
        <div className="daily-stats">
          <h4>آخرین ۷ روز</h4>
          <div className="table-container">
            <table className="products-table">
              <thead><tr><th>تاریخ</th><th>مشتری جدید</th><th>همکار جدید</th></tr></thead>
              <tbody>
                {registrationStats.daily.map(day => (
                  <tr key={day.date}><td>{new Date(day.date).toLocaleDateString('fa-IR')}</td><td>{day.customers}</td><td>{day.partners}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};


export default AdminPage;