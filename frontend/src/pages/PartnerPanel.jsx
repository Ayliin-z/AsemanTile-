// frontend/src/pages/PartnerPanel.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './CustomerPanel.css';

const PartnerPanel = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const navigate = useNavigate();
  const customer = JSON.parse(localStorage.getItem('aseman_customer_auth') || '{}');
  const [partnerInfo, setPartnerInfo] = useState(null);

  const [products, setProducts] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // ========== وضعیت تأیید همکار ==========
  const [partnerStatus, setPartnerStatus] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  
  // ========== ثبت سفارش ==========
  const [submittingOrder, setSubmittingOrder] = useState(false);
  // ========== مودال مقدار (متراژ) ==========
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedProductForCart, setSelectedProductForCart] = useState(null);
  const [cartQuantity, setCartQuantity] = useState(1);
  
  // ========== مودال موفقیت ==========
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastQuote, setLastQuote] = useState(null);

  // ========== مودال جزئیات سفارش ==========
  const [showQuoteDetailModal, setShowQuoteDetailModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [quoteStatusLogs, setQuoteStatusLogs] = useState([]);
  const [loadingQuoteDetail, setLoadingQuoteDetail] = useState(false);

  const [experts, setExperts] = useState([]);
  const [loadingExperts, setLoadingExperts] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');

  // ========== توابع سبد خرید ==========
  const openQuantityModal = (product) => {
    const productWithPrice = {
      ...product,
      displayPrice: product.displayPrice > 0 ? product.displayPrice : 0
    };
    setSelectedProductForCart(productWithPrice);
    setCartQuantity(1);
    setShowQuantityModal(true);
  };

  const addToCartWithQuantity = () => {
    if (!selectedProductForCart) return;
    
    let quantity = Number(cartQuantity);
    if (isNaN(quantity) || quantity < 1) {
      alert('مقدار وارد شده معتبر نیست');
      return;
    }
    
    const price = selectedProductForCart.displayPrice || 0;
    
    // ذخیره در localStorage (هماهنگ با هدر)
    const savedCart = localStorage.getItem('aseman_cart');
    let cart = savedCart ? JSON.parse(savedCart) : [];
    
    const existingIndex = cart.findIndex(item => item.id === selectedProductForCart.id);
    if (existingIndex !== -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        id: selectedProductForCart.id,
        name: selectedProductForCart.name,
        price: price,
        quantity: quantity,
        image: selectedProductForCart.images?.[0] || '/images/placeholder.jpg'
      });
    }
    
    localStorage.setItem('aseman_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage')); // به‌روزرسانی آیکون هدر
    
    const priceText = price > 0 ? `${price.toLocaleString()} تومان` : 'قیمت: جهت استعلام';
    alert(`${selectedProductForCart.name} با مقدار ${quantity} متر مربع به سبد خرید اضافه شد (${priceText})`);
    
    setShowQuantityModal(false);
    setSelectedProductForCart(null);
    setCartQuantity(1);
  };


  const submitCartOrder = async () => {
  const savedCart = localStorage.getItem('aseman_cart');
  if (!savedCart) {
    alert('سبد خرید خالی است');
    return;
  }
  
  const cart = JSON.parse(savedCart);
  if (cart.length === 0) {
    alert('سبد خرید خالی است');
    return;
  }
  
  if (!partnerInfo?.id) {
    alert('اطلاعات همکار یافت نشد');
    return;
  }

  const hasZeroPriceItems = cart.some(item => item.price === 0 || !item.price);
  
  const items = cart.map(item => ({
    product_id: item.id,
    product_name: item.name,
    quantity: item.quantity,
    price: item.price || 0
  }));

  setSubmittingOrder(true);
    try {
      const requestBody = {
        partner_id: partnerInfo.id,
        customer_name: partnerInfo.user_name || '',
        customer_mobile: partnerInfo.user_mobile || '',
        company_name: partnerInfo.company_name || '',
        items: items,
        notes: hasZeroPriceItems ? 'در انتظار تأیید قیمت' : ''
      };

      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();

      if (data.success) {
        // خالی کردن سبد خرید
        localStorage.removeItem('aseman_cart');
        window.dispatchEvent(new Event('storage'));
        
        alert(hasZeroPriceItems 
          ? '✅ درخواست خرید شما با موفقیت ثبت شد.\n\nپس از بررسی جهت اعلام مبلغ دقیق فاکتور، کارشناسان ما با شما تماس حاصل خواهند کرد.\n\nاز شکیبایی شما متشکریم'
          : '✅ سفارش شما با موفقیت ثبت شد');
        
        if (partnerInfo?.id) {
          await loadQuotes();
        }
      } else {
        alert('خطا در ثبت درخواست: ' + (data.error || 'مشخص نشده'));
      }
    } catch (err) {
      console.error('Error submitting order:', err);
      alert('خطای شبکه. لطفاً مجدد تلاش کنید.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // ========== تابع دریافت جزئیات سفارش ==========
  const viewQuoteDetails = async (quote) => {
    setSelectedQuote(quote);
    setShowQuoteDetailModal(true);
    setLoadingQuoteDetail(true);
    
    try {
      const logsRes = await fetch(`/api/quotes/${quote.id}/status-logs`);
      const logsData = await logsRes.json();
      if (logsData.success) {
        setQuoteStatusLogs(logsData.data);
      } else {
        setQuoteStatusLogs([]);
      }
      
      const itemsRes = await fetch(`/api/quotes/${quote.id}`);
      const itemsData = await itemsRes.json();
      if (itemsData.success) {
        setSelectedQuote(prev => ({ ...prev, items: itemsData.data.items }));
      }
    } catch (err) {
      console.error('Error fetching quote details:', err);
    } finally {
      setLoadingQuoteDetail(false);
    }
  };

  // ========== توابع اصلی ==========
  const loadPartnerInfo = async () => {
    if (!customer.id) return;
    try {
      const res = await fetch(`/api/partners/user/${customer.id}`);
      const data = await res.json();
      if (data.success) {
        setPartnerInfo(data.data);
      } else {
        if (customer.type === 'partner') {
          const createRes = await fetch('/api/partners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: customer.id,
              company_name: customer.companyName || 'شرکت همکار',
              user_name: customer.name,
              user_mobile: customer.mobile,
              user_email: customer.email || '',
              city: '',
              address: ''
            })
          });
          const createData = await createRes.json();
          if (createData.success) setPartnerInfo(createData.data);
        }
      }
    } catch (err) {
      console.error('Error loading partner info:', err);
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        const productsList = data.data || [];
        
        const normalizedProducts = productsList.map(p => {
          let price = 0;
          let partnerPrice = 0;
          
          if (p.price_public && p.price_public > 0) price = Number(p.price_public);
          else if (p.price && p.price > 0) price = Number(p.price);
          
          if (p.price_partner && p.price_partner > 0) partnerPrice = Number(p.price_partner);
          else if (p.partnerPrice && p.partnerPrice > 0) partnerPrice = Number(p.partnerPrice);
          else if (p.partnerprice && p.partnerprice > 0) partnerPrice = Number(p.partnerprice);
          
          if (partnerPrice <= 0) partnerPrice = price;
          
          return {
            ...p,
            price: price,
            partnerPrice: partnerPrice,
            displayPrice: partnerPrice > 0 ? partnerPrice : price
          };
        });
        
        const partnerProducts = normalizedProducts.filter(p => {
          const audience = p.audience;
          return !audience || audience === 'all' || audience === 'partners';
        });
        
        setProducts(partnerProducts);
      }
    } catch (err) { console.error(err); }
    finally { setLoadingProducts(false); }
  };

  const loadQuotes = async () => {
    if (!partnerInfo?.id) return;
    setLoadingQuotes(true);
    try {
      // فقط سفارش‌های این همکار رو بگیر
      const res = await fetch(`/api/quotes?partner_id=${partnerInfo.id}`);
      const data = await res.json();
      if (data.success) {
        const quotesWithItems = await Promise.all(
          data.data.map(async (quote) => {
            try {
              const itemsRes = await fetch(`/api/quotes/${quote.id}`);
              const itemsData = await itemsRes.json();
              if (itemsData.success) {
                return { ...quote, items: itemsData.data.items };
              }
              return { ...quote, items: [] };
            } catch (err) {
              console.error(`Error fetching items for quote ${quote.id}:`, err);
              return { ...quote, items: [] };
            }
          })
        );
        setQuotes(quotesWithItems);
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoadingQuotes(false); 
    }
  };

  const loadExperts = async () => {
    setLoadingExperts(true);
    try {
      const res = await fetch('/api/experts');
      const data = await res.json();
      if (data.success) {
        setExperts(data.data);
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoadingExperts(false); 
    }
  };

  const loadWishlist = async () => {
    if (!customer?.id) return;
    setLoadingWishlist(true);
    try {
      const res = await fetch(`/api/wishlist/${customer.id}`);
      const data = await res.json();
      if (data.success) setWishlist(data.data);
    } catch (err) { console.error(err); }
    finally { setLoadingWishlist(false); }
  };

  // دریافت وضعیت تأیید همکار
  const loadPartnerStatus = async () => {
    if (!customer.id) return;
    try {
      const res = await fetch(`/api/partner/status/${customer.id}`);
      const data = await res.json();
      if (data.success) {
        setPartnerStatus(data.data);
        if (data.data.documents) {
          try {
            setUploadedDocs(JSON.parse(data.data.documents));
          } catch(e) {
            setUploadedDocs([]);
          }
        }
      }
    } catch (err) {
      console.error('Error loading partner status:', err);
    }
  };

  // آپلود مدارک توسط همکار
  const handleDocsUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadingDocs(true);
    const formData = new FormData();
    files.forEach(file => formData.append('documents', file));
    formData.append('partner_id', partnerInfo?.id);
    
    try {
      const res = await fetch('/api/partner/upload-documents', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setUploadedDocs([...uploadedDocs, ...data.files]);
        alert('مدارک با موفقیت آپلود شد. پس از تأیید ادمین، امکان ثبت سفارش برای شما فعال می‌شود.');
        setShowUploadModal(false);
        loadPartnerStatus();
      } else {
        alert('خطا در آپلود مدارک: ' + (data.error || 'مشخص نشده'));
      }
    } catch (err) {
      console.error(err);
      alert('خطا در آپلود مدارک');
    } finally {
      setUploadingDocs(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'support') {
      setActiveMenu('support');
    }
  }, []);

  useEffect(() => {
    if (customer.id) {
      loadPartnerInfo();
      loadPartnerStatus();
    }
  }, [customer.id]);

  useEffect(() => {
    const loadPartnerInfo = async () => {
      const customer = JSON.parse(localStorage.getItem('aseman_customer_auth') || '{}');
      if (customer.id) {
        try {
          const res = await fetch(`/api/partners/user/${customer.id}`);
          const data = await res.json();
          if (data.success) {
            setPartnerInfo(data.data);
          }
        } catch (err) {
          console.error('Error loading partner info:', err);
        }
      }
    };
    loadPartnerInfo();
  }, []);
  useEffect(() => {
    if (activeMenu === 'products') loadProducts();
    if (activeMenu === 'new-order') loadProducts();
    if (activeMenu === 'orders' || activeMenu === 'order-status' || activeMenu === 'invoices') {
      if (partnerInfo?.id) loadQuotes();
    }
    if (activeMenu === 'support') loadExperts();
    if (activeMenu === 'wishlist') loadWishlist();
  }, [activeMenu, partnerInfo]);

  const handleLogout = () => {
    localStorage.removeItem('aseman_customer_auth');
    navigate('/login');
  };

  const translateStatus = (status) => {
    const map = {
      submitted: 'منتظر تأیید',
      reviewing: 'در حال بررسی',
      issued: 'صادر شده',
      preparing: 'در حال آماده‌سازی',
      completed: 'تکمیل شده',
      cancelled: 'لغو شده'
    };
    return map[status] || status;
  };

  const getStatusLabel = (status) => {
    const map = {
      submitted: 'ثبت شده',
      reviewing: 'در حال بررسی',
      issued: 'صادر شده',
      waiting_customer: 'در انتظار مشتری',
      preparing: 'در حال آماده‌سازی',
      completed: 'تکمیل شده',
      final_confirmed: 'تأیید نهایی',
      cancelled: 'لغو شده'
    };
    return map[status] || status;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fa-IR') + ' - ' + date.toLocaleTimeString('fa-IR');
  };

  // ========== مودال آپلود مدارک ==========
  const renderUploadModal = () => {
    if (!showUploadModal) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
          background: 'white', 
          padding: 30, 
          borderRadius: 24, 
          maxWidth: 500, 
          width: '90%',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: '#13314c' }}>📎 آپلود مدارک</h3>
            <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>✖</button>
          </div>
          
          <p style={{ marginBottom: 10 }}>لطفاً مدارک زیر را آپلود کنید:</p>
          <ul style={{ textAlign: 'right', marginBottom: 20, paddingRight: 20 }}>
            <li>✅ کارت ملی</li>
            <li>✅ جواز کسب یا مجوز فعالیت</li>
            <li>✅ تصویر قرارداد همکاری</li>
          </ul>
          
          <div className="upload-area" style={{ 
            border: '2px dashed #1c7385', 
            borderRadius: 16, 
            padding: 20, 
            marginBottom: 20
          }}>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleDocsUpload}
              disabled={uploadingDocs}
              id="partner-docs-upload"
              style={{ display: 'none' }}
            />
            <button 
              type="button"
              className="btn-primary"
              onClick={() => document.getElementById('partner-docs-upload').click()}
              disabled={uploadingDocs}
              style={{ padding: '10px 24px' }}
            >
              {uploadingDocs ? 'در حال آپلود...' : '📤 انتخاب و آپلود مدارک'}
            </button>
          </div>
          
          {uploadedDocs.length > 0 && (
            <div style={{ marginTop: 15, textAlign: 'right' }}>
              <p><strong>مدارک آپلود شده:</strong></p>
              {uploadedDocs.map((doc, idx) => (
                <div key={idx} style={{ background: '#f0f4f7', padding: '5px 10px', marginTop: 5, borderRadius: 8 }}>
                  📄 {doc.originalName || doc.filename}
                </div>
              ))}
            </div>
          )}
          
          <button className="btn-secondary" onClick={() => setShowUploadModal(false)} style={{ marginTop: 15, padding: '10px 24px' }}>
            بستن
          </button>
        </div>
      </div>
    );
  };

  // ========== رندر لیست محصولات ==========
  // ========== رندر لیست محصولات ==========
  const renderProductList = (title) => {
    const isFinalApproved = partnerStatus?.status === 'final_approved';
    
    const filteredProducts = products.filter(p =>
      p.name?.toLowerCase().includes(partnerSearchTerm?.toLowerCase() || '') ||
      (p.productCode && p.productCode.toLowerCase().includes(partnerSearchTerm?.toLowerCase() || ''))
    );
    
    // تابع کمکی برای گرفتن تصویر محصول
    const getProductImage = (product) => {
      if (product.images && product.images.length > 0) {
        let img = product.images[0];
        if (img && img.startsWith('http')) return img;
        if (img && img.startsWith('/uploads')) return `${img}`;
        if (img) return `/uploads/${img}`;
      }
      return '/images/placeholder.jpg';
    };
    
    return (
      <div style={{ padding: '20px 0' }}>
        {/* هدر - بدون دکمه سبد خرید */}
        <h2 style={{ color: '#13314c', marginBottom: 20 }}>{title}</h2>

        {/* باکس جستجو */}
        <div style={{
          display: 'flex', alignItems: 'center', background: 'white',
          border: '2px solid #13314c', borderRadius: 50, padding: '3px',
          marginBottom: 25, boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <input 
            type="text" 
            placeholder="جستجوی سریع محصول..." 
            value={partnerSearchTerm}
            onChange={(e) => setPartnerSearchTerm(e.target.value)}
            style={{ border: 'none', outline: 'none', padding: '12px 15px', fontSize: 15, width: '100%', background: 'transparent', color: '#13314c', fontFamily: 'inherit' }}
          />
          <button style={{ background: '#13314c', border: 'none', color: 'white', width: 42, height: 42, borderRadius: '50%', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 5 }}>🔍</button>
        </div>

        {/* لیست محصولات */}
        {loadingProducts ? (
          <p>در حال بارگذاری...</p>
        ) : filteredProducts.length === 0 ? (
          <p>محصولی با این مشخصات یافت نشد.</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 15 }}>
              {filteredProducts.map(product => (
                <div key={product.id} style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 12, padding: 15, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position: 'relative' }}>
                  <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8, marginBottom: 10, cursor: 'pointer' }}
                    />
                    <h4 style={{ marginBottom: 8, color: '#13314c', cursor: 'pointer' }}>{product.name}</h4>
                  </Link>
                  <p style={{ color: '#1c7385', fontWeight: 'bold', marginBottom: 10 }}>
                    {product.displayPrice > 0 ? (
                      `${product.displayPrice.toLocaleString()} تومان`
                    ) : (
                      <span style={{ color: '#e67e22', fontSize: '13px' }}>📞 جهت استعلام قیمت تماس بگیرید</span>
                    )}
                  </p>

                  <button 
                    className="btn-primary" 
                    style={{ 
                      width: '100%',
                      opacity: !isFinalApproved ? 0.6 : 1,
                      cursor: !isFinalApproved ? 'not-allowed' : 'pointer'
                    }}
                    onClick={() => isFinalApproved && openQuantityModal(product)}
                    disabled={!isFinalApproved}
                  >
                    {!isFinalApproved ? '🔒 در انتظار تأیید نهایی' : '➕ افزودن به سبد'}
                  </button>
                </div>
              ))}
            </div>

            {/* ========== دکمه ثبت نهایی سفارش ========== */}
            <div style={{ marginTop: 40, textAlign: 'center', borderTop: '1px solid #e3dede', paddingTop: 30 }}>
              <button 
                onClick={submitCartOrder}
                disabled={submittingOrder}
                style={{ 
                  background: '#ffd800', 
                  color: '#13314c', 
                  border: 'none', 
                  padding: '14px 40px', 
                  borderRadius: 40, 
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  cursor: 'pointer',
                  opacity: submittingOrder ? 0.7 : 1
                }}
              >
                {submittingOrder ? '⏳ در حال ثبت...' : '📦 ثبت نهایی سفارش'}
              </button>
              <p style={{ fontSize: 12, color: '#7c8788', marginTop: 12 }}>
                🧾 محصولات بدون قیمت پس از تأیید کارشناسان، مبلغ نهایی به شما اعلام خواهد شد
              </p>
            </div>
            {/* ===================================== */}
          </>
        )}
      </div>
    );
  };

  // ========== مودال دریافت مقدار ==========
  const renderQuantityModal = () => {
    if (!showQuantityModal || !selectedProductForCart) return null;
    
    const product = selectedProductForCart;
    const hasPrice = product.displayPrice > 0;
    
    return (
      <div className="modal-overlay" onClick={() => setShowQuantityModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
          background: 'white', 
          padding: 25, 
          borderRadius: 20, 
          maxWidth: 400, 
          width: '90%',
          textAlign: 'center',
          position: 'relative'
        }}>
          <button 
            onClick={() => setShowQuantityModal(false)}
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#999',
              padding: '5px'
            }}
          >
            ✖
          </button>
          
          <h3 style={{ margin: '0 0 15px 0', color: '#13314c' }}>➕ افزودن به سبد خرید</h3>
          
          <p><strong>{product.name}</strong></p>
          
          {hasPrice ? (
            <p style={{ color: '#1c7385', fontWeight: 'bold', marginBottom: 15 }}>
              قیمت: {product.displayPrice.toLocaleString()} تومان
            </p>
          ) : (
            <p style={{ color: '#e67e22', fontWeight: 'bold', marginBottom: 15 }}>
              📞 جهت استعلام قیمت تماس بگیرید
            </p>
          )}
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#13314c' }}>
              مقدار (متر مربع):
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={cartQuantity}
              onChange={(e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val) || val < 1) val = 1;
                setCartQuantity(val);
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '2px solid #e3dede',
                borderRadius: '12px',
                textAlign: 'center',
                fontFamily: 'inherit'
              }}
              autoFocus
            />
          </div>
          
          <div style={{ display: 'flex', gap: 15, justifyContent: 'center' }}>
            <button
              className="btn-primary"
              onClick={addToCartWithQuantity}
              style={{ padding: '10px 25px', cursor: 'pointer' }}
            >
              ➕ افزودن به سبد
            </button>
          </div>
        </div>
      </div>
    );
  };


  // ========== مودال موفقیت ==========
  const renderSuccessModal = () => {
    if (!showSuccessModal || !lastQuote) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
          background: 'white', 
          padding: 30, 
          borderRadius: 20, 
          maxWidth: 450, 
          width: '90%',
          textAlign: 'center',
          direction: 'rtl'
        }}>
          <div style={{ fontSize: 48, marginBottom: 15 }}>✅</div>
          <h2 style={{ color: '#13314c', marginBottom: 15 }}>درخواست شما ثبت شد!</h2>
          
          <div style={{ 
            background: '#f0f4f7', 
            padding: 15, 
            borderRadius: 12, 
            marginBottom: 20,
            textAlign: 'right'
          }}>
            <p style={{ margin: '5px 0' }}><strong>📄 شماره پیش‌فاکتور:</strong> {lastQuote.quote_number}</p>
            <p style={{ margin: '5px 0' }}><strong>💰 مبلغ کل:</strong> {lastQuote.total_amount.toLocaleString()} تومان</p>
          </div>
          
          <p style={{ color: '#4a5c64', lineHeight: 1.8, marginBottom: 25 }}>
            📞 کارشناسان مجموعه جهت تکمیل سفارش در سریع‌ترین زمان ممکن با شما تماس حاصل خواهند کرد.
          </p>
          
          <p style={{ color: '#1c7385', fontSize: 14, marginBottom: 20 }}>
            با تشکر از اعتماد شما
          </p>
          
          <div style={{ display: 'flex', gap: 15, justifyContent: 'center' }}>
            <button
              className="btn-secondary"
              onClick={() => setShowSuccessModal(false)}
              style={{ padding: '10px 25px', cursor: 'pointer' }}
            >
              بستن
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setShowSuccessModal(false);
                setActiveMenu('invoices');
              }}
              style={{ padding: '10px 25px', cursor: 'pointer' }}
            >
              📋 مشاهده پیش‌فاکتورها
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ========== مودال جزئیات سفارش ==========
  const renderQuoteDetailModal = () => {
    if (!showQuoteDetailModal || !selectedQuote) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setShowQuoteDetailModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
          background: 'white', 
          padding: 25, 
          borderRadius: 20, 
          maxWidth: 800, 
          width: '90%',
          maxHeight: '85vh',
          overflow: 'auto',
          margin: 'auto',
          marginTop: '5%'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: '#13314c' }}>📄 جزئیات سفارش</h3>
            <button onClick={() => setShowQuoteDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>✖</button>
          </div>
          
          <div style={{ background: '#f0f4f7', padding: 15, borderRadius: 12, marginBottom: 20 }}>
            <p><strong>🔢 شماره سفارش:</strong> {selectedQuote.quote_number}</p>
            <p><strong>📅 تاریخ ثبت:</strong> {formatDate(selectedQuote.created_at)}</p>
            <p><strong>💰 مبلغ کل:</strong> {selectedQuote.total_amount?.toLocaleString()} تومان</p>
            <p><strong>📌 وضعیت فعلی:</strong> <span className={`status-badge status-${selectedQuote.status}`}>{getStatusLabel(selectedQuote.status)}</span></p>
            {selectedQuote.notes && <p><strong>📝 یادداشت:</strong> {selectedQuote.notes}</p>}
          </div>
          
          <h4 style={{ color: '#13314c', marginBottom: 10 }}>🛒 محصولات سفارش</h4>
          <div className="table-container" style={{ marginBottom: 25 }}>
            <table className="products-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'right' }}>نام محصول</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>تعداد (متر مربع)</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>قیمت واحد</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>جمع</th>
                </tr>
              </thead>
              <tbody>
                {selectedQuote.items && selectedQuote.items.length > 0 ? (
                  selectedQuote.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e3dede' }}>
                      <td style={{ padding: '12px' }}>{item.product_name}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{item.price?.toLocaleString()} تومان</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#1c7385' }}>{(item.quantity * item.price)?.toLocaleString()} تومان</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>در حال بارگذاری...</td></tr>
                )}
              </tbody>
            </table>
          </div>
          
          <h4 style={{ color: '#13314c', marginBottom: 10 }}>📊 تاریخچه وضعیت سفارش</h4>
          {loadingQuoteDetail ? (
            <p style={{ textAlign: 'center', padding: '20px' }}>در حال بارگذاری...</p>
          ) : quoteStatusLogs.length === 0 ? (
            <p style={{ color: '#7c8788', textAlign: 'center', padding: '20px' }}>هیچ تغییری در وضعیت سفارش ثبت نشده است.</p>
          ) : (
            <div className="table-container">
              <table className="products-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'right' }}>زمان</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>وضعیت قبلی</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>وضعیت جدید</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>توضیحات</th>
                  </tr>
                </thead>
                <tbody>
                  {quoteStatusLogs.map((log, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e3dede' }}>
                      <td style={{ padding: '12px', fontSize: 12 }}>{formatDate(log.created_at)}</td>
                      <td style={{ padding: '12px' }}>{getStatusLabel(log.old_status) || '—'}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`status-badge status-${log.new_status}`}>{getStatusLabel(log.new_status)}</span>
                      </td>
                      <td style={{ padding: '12px' }}>{log.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn-secondary" onClick={() => setShowQuoteDetailModal(false)} style={{ padding: '10px 25px' }}>
              بستن
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ========== رندر محتوای اصلی ==========
  const renderContent = () => {
    // پیام وضعیت تأیید
    const statusMessage = () => {
      if (!partnerStatus) return null;
      
      if (partnerStatus.status === 'initial_approved') {
        return (
          <div style={{ 
            background: '#fff3e0', 
            borderRight: '4px solid #f57c00', 
            padding: '15px 20px', 
            borderRadius: 12, 
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 15
          }}>
            <div>
              <span style={{ fontSize: 20, marginLeft: 10 }}>⚠️</span>
              <strong style={{ color: '#f57c00' }}>تکمیل اطلاعات مورد نیاز است!</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: 13, color: '#666' }}>
                جهت تکمیل فرآیند ثبت‌نام و فعال‌سازی کامل حساب همکاری، لطفاً مدارک مورد نیاز را آپلود کنید.
              </p>
            </div>
            <button 
              onClick={() => setShowUploadModal(true)}
              style={{
                background: '#f57c00',
                color: 'white',
                border: 'none',
                padding: '8px 20px',
                borderRadius: 30,
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              📎 آپلود مدارک
            </button>
          </div>
        );
      }
      
      // بخش final_approved حذف شد - دیگر پیام تأیید نهایی نمایش داده نمی‌شود
      
      return null;
    };
    
    switch (activeMenu) {
      case 'products':
        return (
          <>
            {statusMessage()}
            {renderProductList('🛒 محصولات قابل سفارش')}
          </>
        );
      case 'new-order':
        return (
          <>
            {statusMessage()}
            {renderProductList('📝 سبد خرید خود را تکمیل کنید')}
          </>
        );
      case 'order-status':
        return (
          <div style={{ padding: '20px 0' }}>
            {statusMessage()}
            <h2 style={{ color: '#13314c', marginBottom: 20 }}>📊 وضعیت سفارش‌ها</h2>
            {loadingQuotes ? (
              <p>در حال بارگذاری...</p>
            ) : quotes.length === 0 ? (
              <p>هیچ سفارشی ثبت نشده است.</p>
            ) : (
              <div className="table-container">
                <table className="products-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f0f4f7', borderBottom: '2px solid #e3dede' }}>
                      <th style={{ padding: '12px', textAlign: 'right' }}>شماره سفارش</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>تاریخ ثبت</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>مبلغ کل (تومان)</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>وضعیت</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map(q => (
                      <tr key={q.id} style={{ borderBottom: '1px solid #e3dede' }}>
                        <td style={{ padding: '12px' }}>{q.quote_number}</td>
                        <td style={{ padding: '12px' }}>{new Date(q.created_at).toLocaleDateString('fa-IR')}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#1c7385' }}>{q.total_amount?.toLocaleString()}</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`status-badge status-${q.status}`} style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            background: q.status === 'submitted' ? '#e3f2fd' : 
                                      q.status === 'reviewing' ? '#fff3e0' :
                                      q.status === 'issued' ? '#e8f5e9' :
                                      q.status === 'completed' ? '#e0f2f1' : '#ffebee',
                            color: q.status === 'submitted' ? '#1976d2' : 
                                  q.status === 'reviewing' ? '#f57c00' :
                                  q.status === 'issued' ? '#388e3c' :
                                  q.status === 'completed' ? '#00796b' : '#d32f2f'
                          }}>
                            {translateStatus(q.status)}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button 
                            onClick={() => viewQuoteDetails(q)}
                            style={{
                              background: '#1c7385',
                              color: 'white',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '20px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                          >
                            🔍 جزئیات
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'orders':
        return (
          <div style={{ padding: '20px 0' }}>
            {statusMessage()}
            <h2 style={{ color: '#13314c', marginBottom: 20 }}>🕐 سفارش‌های اخیر</h2>
            {loadingQuotes ? <p>در حال بارگذاری...</p> : quotes.length === 0 ? <p>هیچ سفارشی ثبت نشده است.</p> : (
              <div className="table-container">
                <table className="products-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '12px' }}>شماره</th>
                      <th style={{ padding: '12px' }}>تاریخ</th>
                      <th style={{ padding: '12px' }}>مبلغ کل (تومان)</th>
                      <th style={{ padding: '12px' }}>وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.slice(0,5).map(q => (
                      <tr key={q.id}>
                        <td style={{ padding: '12px' }}>{q.quote_number}</td>
                        <td style={{ padding: '12px' }}>{new Date(q.created_at).toLocaleDateString('fa-IR')}</td>
                        <td style={{ padding: '12px' }}>{q.total_amount?.toLocaleString()}</td>
                        <td style={{ padding: '12px' }}><span className={`status-badge status-${q.status}`}>{translateStatus(q.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'invoices':
        return (
          <div style={{ padding: '20px 0' }}>
            {statusMessage()}
            <h2 style={{ color: '#13314c', marginBottom: 20 }}>📄 پیش‌فاکتورها</h2>
            {loadingQuotes ? <p>در حال بارگذاری...</p> : quotes.filter(q => 
              q.status === 'submitted' || 
              q.status === 'reviewing' || 
              q.status === 'issued' || 
              q.status === 'completed'
            ).length === 0 ? <p>هیچ پیش‌فاکتوری ثبت نشده است.</p> : (
              <div className="table-container">
                <table className="products-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '12px' }}>شماره</th>
                      <th style={{ padding: '12px' }}>تاریخ</th>
                      <th style={{ padding: '12px' }}>مبلغ کل (تومان)</th>
                      <th style={{ padding: '12px' }}>وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.filter(q => 
                      q.status === 'submitted' || 
                      q.status === 'reviewing' || 
                      q.status === 'issued' || 
                      q.status === 'completed'
                    ).map(q => (
                      <tr key={q.id}>
                        <td style={{ padding: '12px' }}>{q.quote_number}</td>
                        <td style={{ padding: '12px' }}>{new Date(q.created_at).toLocaleDateString('fa-IR')}</td>
                        <td style={{ padding: '12px' }}>{q.total_amount?.toLocaleString()}</td>
                        <td style={{ padding: '12px' }}><span className={`status-badge status-${q.status}`}>{translateStatus(q.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'support':
        return (
          <div style={{ padding: '20px 0' }}>
            {statusMessage()}
            <h2 style={{ color: '#13314c', marginBottom: 20 }}>🎧 ارتباط با کارشناسان ما</h2>
            {loadingExperts ? (
              <p>در حال بارگذاری...</p>
            ) : experts.length === 0 ? (
              <p>هیچ کارشناسی ثبت نشده است.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20 }}>
                {experts.map(expert => (
                  <div key={expert.id} style={{ 
                    background: 'white', 
                    borderRadius: 16, 
                    padding: 20, 
                    textAlign: 'center', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    border: '1px solid #e3dede',
                    transition: 'transform 0.2s'
                  }}>
                    {expert.photo ? (
                      <img 
                        src={expert.photo} 
                        alt={expert.name} 
                        style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginBottom: 12, border: '2px solid #1c7385' }} 
                      />
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#13314c', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                        <span style={{ fontSize: 40, color: 'white' }}>👤</span>
                      </div>
                    )}
                    <h3 style={{ margin: '0 0 8px', color: '#13314c' }}>{expert.name}</h3>
                    <p style={{ direction: 'ltr', margin: '5px 0', color: '#555', fontSize: 14 }}>{expert.phone}</p>
                    <a 
                      href={`tel:${expert.phone}`} 
                      style={{ 
                        display: 'inline-block', 
                        padding: '8px 20px', 
                        background: '#1c7385', 
                        color: 'white', 
                        borderRadius: 30, 
                        textDecoration: 'none', 
                        fontWeight: 'bold', 
                        marginTop: 10,
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#0f5a6b'}
                      onMouseLeave={(e) => e.target.style.background = '#1c7385'}
                    >
                      📞 تماس بگیرید
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'account':
        return (
          <div style={{ padding: '20px 0' }}>
            {statusMessage()}
            <h2 style={{ color: '#13314c', marginBottom: 20 }}>👤 اطلاعات حساب کاربری</h2>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div className="detail-row" style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}><span style={{ fontWeight: 'bold', color: '#13314c', width: 100, display: 'inline-block' }}>نام:</span> {customer.name || '-'}</div>
              <div className="detail-row" style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}><span style={{ fontWeight: 'bold', color: '#13314c', width: 100, display: 'inline-block' }}>موبایل:</span> {customer.mobile || '-'}</div>
              <div className="detail-row" style={{ padding: '10px 0' }}><span style={{ fontWeight: 'bold', color: '#13314c', width: 100, display: 'inline-block' }}>ایمیل:</span> {customer.email || '-'}</div>
            </div>
          </div>
        );
      case 'wishlist':
        return (
          <div style={{ padding: '20px 0' }}>
            {statusMessage()}
            <h2 style={{ color: '#13314c', marginBottom: 20 }}>❤️ علاقه‌مندی‌های من</h2>
            {loadingWishlist ? <p>در حال بارگذاری...</p> : wishlist.length === 0 ? <p>هیچ محصولی به لیست اضافه نشده است.</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 15 }}>
                {wishlist.map(item => (
                  <div key={item.id} style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 12, padding: 15, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <img src={item.images?.length > 0 ? item.images[0] : '/images/placeholder.jpg'} alt={item.name} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />
                    <h4 style={{ marginBottom: 8, color: '#13314c' }}>{item.name}</h4>
                    <p style={{ color: '#1c7385', fontWeight: 'bold', marginBottom: 10 }}>{Number(item.price_public).toLocaleString()} تومان</p>
                    <button className="btn-primary" style={{ width: '100%' }} onClick={async () => { await fetch(`/api/wishlist/${item.id}`, { method: 'DELETE' }); loadWishlist(); }}>🗑️ حذف</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return (
          <>
            {statusMessage()}
            <div style={{ background: 'white', borderRadius: 20, padding: 30, marginBottom: 25, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' }}>
              <h2 style={{ color: '#13314c', marginTop: 0, fontSize: 22, marginBottom: 8 }}>🎉 خوش آمدید، {customer.name || 'همکار گرامی'}!</h2>
              <p style={{ color: '#4a5c64', fontSize: 15, margin: 0 }}>همکار عزیز، از طریق پنل کاربری خود می‌توانید به قیمت‌های ویژه همکاران و ثبت سفارش سریع دسترسی داشته باشید.</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #13314c 0%, #1c7385 100%)', borderRadius: 20, padding: '30px 40px', marginBottom: 30, textAlign: 'center', color: 'white', boxShadow: '0 8px 25px rgba(28, 115, 133, 0.3)', border: '2px solid #ffd800' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🛒</div>
              <h2 style={{ fontSize: 28, fontWeight: 'bold', margin: '0 0 10px 0', color: '#ffd800' }}>سفارش خود را ثبت کنید</h2>
              <p style={{ fontSize: 16, margin: '0 0 20px 0', opacity: 0.9, color: '#e3dede' }}>قیمت ویژه جهت همکاران عزیز – همین حالا محصولات را ببینید و سفارش دهید</p>
              <button onClick={() => setActiveMenu('new-order')} style={{ background: '#ffd800', color: '#13314c', border: 'none', padding: '14px 40px', borderRadius: 40, fontSize: 18, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 12px rgba(255, 216, 0, 0.4)' }}>
                📝 ثبت سفارش جدید
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginTop: 10 }}>
              {[
                { id: 'order-status', icon: '📊', title: 'وضعیت سفارش‌ها', desc: 'مشاهده آخرین وضعیت سفارشات', color: '#4facfe' },
                { id: 'new-order', icon: '📝', title: 'ثبت سفارش', desc: 'ایجاد سفارش جدید', color: '#f093fb' },
                { id: 'products', icon: '🛒', title: 'محصولات', desc: 'مشاهده همه محصولات', color: '#43e97b' },
                { id: 'orders', icon: '🕐', title: 'سفارش‌های اخیر', desc: 'مشاهده سفارشات اخیر', color: '#fa709a' },
                { id: 'invoices', icon: '📄', title: 'پیش‌فاکتورها', desc: 'مشاهده پیش‌فاکتورها', color: '#667eea' },
                { id: 'support', icon: '🎧', title: 'پشتیبانی', desc: 'ارتباط با کارشناسان', color: '#f5af19' },
                { id: 'account', icon: '👤', title: 'حساب کاربری', desc: 'اطلاعات حساب', color: '#6c5ce7' },
                { id: 'wishlist', icon: '❤️', title: 'علاقه‌مندی‌ها', desc: 'لیست علاقه‌مندی‌ها', color: '#e91e63' }
              ].map(card => {
                if (card.id === 'products') {
                  return (
                    <Link key={card.id} to="/products" style={{ textDecoration: 'none' }}>
                      <div style={{ background: 'white', borderRadius: 16, padding: '25px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s ease', border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderTop: `4px solid ${card.color}`, height: '100%' }}>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>{card.icon}</div>
                        <h3 style={{ margin: '0 0 6px 0', color: '#13314c', fontSize: 16, fontWeight: 'bold' }}>{card.title}</h3>
                        <p style={{ margin: 0, color: '#666', fontSize: 12 }}>{card.desc}</p>
                      </div>
                    </Link>
                  );
                }
                return (
                  <div key={card.id} onClick={() => setActiveMenu(card.id)} style={{ background: 'white', borderRadius: 16, padding: '25px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s ease', border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderTop: `4px solid ${card.color}` }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>{card.icon}</div>
                    <h3 style={{ margin: '0 0 6px 0', color: '#13314c', fontSize: 16, fontWeight: 'bold' }}>{card.title}</h3>
                    <p style={{ margin: 0, color: '#666', fontSize: 12 }}>{card.desc}</p>
                  </div>
                );
              })}
            </div>
          </>
        );
    }
  };

  return (
    <>
      {/* دکمه خروج شناور در گوشه بالا‑راست */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 1000,
      }}>
        <button
          onClick={handleLogout}
          style={{
            background: '#a70023',
            color: 'white',
            border: 'none',
            padding: '12px 28px',
            borderRadius: '40px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.background = '#8b001a'}
          onMouseLeave={(e) => e.target.style.background = '#a70023'}
        >
          🚪 خروج
        </button>
      </div>

      {/* کانتینر اصلی پنل (بدون هدر داخلی) */}
      <div style={{
        direction: 'rtl',
        width: '95%',
        maxWidth: 1600,
        margin: '20px auto',
        padding: '0 15px',
      }}>
        <div style={{
          background: '#f4f2f0',
          borderRadius: 20,
          padding: 20,
          minHeight: 400,
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          {renderContent()}
        </div>
      </div>

      {/* مودال‌ها */}
      {renderQuantityModal()}
      {renderSuccessModal()}
      {renderQuoteDetailModal()}
      {renderUploadModal()}
    </>
  );
};

export default PartnerPanel;