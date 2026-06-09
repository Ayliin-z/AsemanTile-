// frontend/src/pages/LandingPage.jsx
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../utils/storage'
import { getCurrentUserRole } from '../utils/customerAuth'
import { getSiteSettings } from '../utils/siteSettings'
import { getBlogPosts } from '../utils/blog'
import './LandingPage.css'

const sliderImages = [
  '/images/slider1.jpg',
  '/images/slider2.jpg',
  '/images/slider3.jpg',
]

// ========== دیتای نمایشی برای نظرات مشتریان ==========
const initialTestimonials = [
  {
    id: 1,
    name: 'علی رضایی',
    position: 'مدیر پروژه ساختمانی',
    text: 'کیفیت محصولات آسمان واقعاً عالی بود. سرامیک‌ها دقیقاً مطابق با نمونه‌ها و با دقت بالا تحویل داده شد. حتماً همکاری ادامه خواهد داشت.',
    rating: 5,
    avatar: '/images/avatars/avatar1.jpg'
  },
  {
    id: 2,
    name: 'سارا محمدی',
    position: 'طراح داخلی',
    text: 'من به عنوان طراح داخلی، همیشه به دنبال محصولات باکیفیت و تنوع بالا هستم. آسمان انتخاب اول من برای کاشی و سرامیک شده.',
    rating: 5,
    avatar: '/images/avatars/avatar2.jpg'
  },
  {
    id: 3,
    name: 'رضا کریمی',
    position: 'مالک فروشگاه',
    text: 'بسیار حرفه‌ای و سریع. قیمت‌ها رقابتی و پشتیبانی عالی. مشتریان من راضی هستند.',
    rating: 4,
    avatar: '/images/avatars/avatar3.jpg'
  },
  {
    id: 4,
    name: 'مریم حسینی',
    position: 'مدیر خرید',
    text: 'تنوع محصولات و سرعت تحویل فراتر از انتظار بود. حتماً به دیگران هم توصیه می‌کنم.',
    rating: 5,
    avatar: '/images/avatars/avatar4.jpg'
  },
  {
    id: 5,
    name: 'احمد نادری',
    position: 'سرمایه‌گذار ساختمانی',
    text: 'از همکاری با آسمان بسیار راضی هستم. محصولات با کیفیت و قیمت مناسب، تحویل به موقع.',
    rating: 5,
    avatar: '/images/avatars/avatar5.jpg'
  },
  {
    id: 6,
    name: 'زهرا احمدی',
    position: 'معمار',
    text: 'به‌عنوان یک معمار، همیشه به دنبال متریال باکیفیت هستم. آسمان نیاز من را کاملاً برطرف کرده است.',
    rating: 4,
    avatar: '/images/avatars/avatar6.jpg'
  }
];

const LandingPage = () => {
  const [products, setProducts] = useState([])
  const [salesMode, setSalesMode] = useState('cart')
  const userRole = getCurrentUserRole()
  const [blogPosts, setBlogPosts] = useState([])
  const [brands, setBrands] = useState([]) // اطلاعات کامل برندها
  const [loadingBrands, setLoadingBrands] = useState(true) // وضعیت لودینگ برندها
  
  // ===== State برای کاروسل کارخانه‌ها =====
  const [manufacturerIndex, setManufacturerIndex] = useState(0);
  const [manufacturersPerPage, setManufacturersPerPage] = useState(4);
  
  const [showConsultModal, setShowConsultModal] = useState(false)
  const [consultName, setConsultName] = useState('')
  const [consultMobile, setConsultMobile] = useState('')
  const [consultTime, setConsultTime] = useState('')
  
  // ===== State برای اسلایدر نظرات =====
  const [testimonials] = useState(initialTestimonials)
  const [testimonialIndex, setTestimonialIndex] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(3)
  
  // ===== State برای بالون اطلاع‌رسانی =====
  const [hasClickedConsult, setHasClickedConsult] = useState(false)

  // ===== تابع دریافت اطلاعات کامل برندها از API =====
  const loadBrands = async () => {
    setLoadingBrands(true);
    try {
      console.log('Fetching brands from API...');
      const res = await fetch('http://localhost:5003/api/brands');
      console.log('Response status:', res.status);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Brands API response:', data);
      
      // بررسی ساختار پاسخ - API مستقیماً آرایه برمی‌گرداند
      let brandsArray = [];
      if (Array.isArray(data)) {
        // اگر مستقیماً آرایه باشد
        brandsArray = data;
      } else if (data.success && Array.isArray(data.data)) {
        // اگر داخل data.data باشد
        brandsArray = data.data;
      } else if (data.data && Array.isArray(data.data)) {
        brandsArray = data.data;
      } else {
        console.error('Invalid response format:', data);
        setBrands([]);
        return;
      }
      
      // فقط برندهای فعال (enabled === 1 یا enabled === true) را فیلتر کن
      const activeBrands = brandsArray.filter(b => {
        // بررسی فعال بودن برند (ممکن است به صورت 1/0 یا true/false باشد)
        if (b.enabled === 1 || b.enabled === true) return true;
        if (b.enabled === 0 || b.enabled === false) return false;
        // اگر enabled تعریف نشده، پیش‌فرض فعال
        return true;
      });
      
      console.log('Active brands:', activeBrands);
      setBrands(activeBrands);
    } catch (error) {
      console.error('Error loading brands:', error);
      setBrands([]);
    } finally {
      setLoadingBrands(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const prods = await getProducts();
        setProducts(prods);
        const settings = await getSiteSettings();
        setSalesMode(settings.salesMode);
        const posts = await getBlogPosts(true);
        setBlogPosts(posts);
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    };
    loadData();
  }, []);

  // بارگذاری برندها (بدون وابستگی به userRole، همیشه بارگذاری می‌شود)
  useEffect(() => {
    loadBrands();
  }, []);

  // تنظیم تعداد آیتم در هر اسلاید بر اساس عرض صفحه (برای کارخانه‌ها)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setManufacturersPerPage(2);
      } else if (window.innerWidth < 1024) {
        setManufacturersPerPage(3);
      } else {
        setManufacturersPerPage(4);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // اسلایدر خودکار کارخانه‌ها (هر ۵ ثانیه)
  useEffect(() => {
    if (brands.length <= manufacturersPerPage || brands.length === 0) return;
    const interval = setInterval(() => {
      setManufacturerIndex(prev => 
        prev + manufacturersPerPage >= brands.length ? 0 : prev + manufacturersPerPage
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [brands.length, manufacturersPerPage]);

  // محاسبه کارخانه‌های قابل نمایش
  const visibleManufacturers = useMemo(() => {
    if (brands.length === 0) return [];
    if (brands.length <= manufacturersPerPage) {
      return brands;
    }
    const start = manufacturerIndex;
    const end = Math.min(start + manufacturersPerPage, brands.length);
    const visible = brands.slice(start, end);
    // اگر تعداد کمتر از manufacturersPerPage شد، از اول پر کن
    if (visible.length < manufacturersPerPage && start > 0) {
      const remaining = manufacturersPerPage - visible.length;
      return [...visible, ...brands.slice(0, remaining)];
    }
    return visible;
  }, [brands, manufacturerIndex, manufacturersPerPage]);

  // توابع حرکت به چپ و راست
  const prevManufacturers = () => {
    setManufacturerIndex(prev => {
      const newIndex = prev - manufacturersPerPage;
      if (newIndex < 0) {
        return Math.max(0, brands.length - manufacturersPerPage);
      }
      return newIndex;
    });
  };

  const nextManufacturers = () => {
    setManufacturerIndex(prev => {
      const newIndex = prev + manufacturersPerPage;
      if (newIndex >= brands.length) {
        return 0;
      }
      return newIndex;
    });
  };

  // محاسبه تعداد صفحات برای دات‌ها
  const totalManufacturerPages = Math.ceil(brands.length / manufacturersPerPage);
  const currentManufacturerPage = Math.floor(manufacturerIndex / manufacturersPerPage);

  // تنظیم تعداد آیتم در هر اسلاید برای نظرات بر اساس عرض صفحه
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setItemsPerPage(1)
      } else {
        setItemsPerPage(3)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // اسلایدر خودکار نظرات هر ۶ ثانیه
  useEffect(() => {
    if (testimonials.length <= itemsPerPage) return
    const interval = setInterval(() => {
      setTestimonialIndex(prev => 
        prev + itemsPerPage >= testimonials.length ? 0 : prev + itemsPerPage
      )
    }, 6000)
    return () => clearInterval(interval)
  }, [testimonials.length, itemsPerPage])

  // ===== تابع ثبت درخواست مشاوره (مودال) =====
  const handleConsultSubmit = (e) => {
    e.preventDefault()
    if (!consultName || !consultMobile) {
      alert('لطفاً نام و شماره تماس خود را وارد کنید')
      return
    }
    if (!consultTime) {
      alert('لطفاً بازه زمانی تماس را انتخاب کنید')
      return
    }
    
    const requests = JSON.parse(localStorage.getItem('consult_requests') || '[]')
    requests.push({
      name: consultName,
      mobile: consultMobile,
      preferred_time: consultTime,
      date: new Date().toISOString()
    })
    localStorage.setItem('consult_requests', JSON.stringify(requests))
    
    alert('درخواست مشاوره شما با موفقیت ثبت شد. کارشناسان ما در زمان انتخابی با شما تماس خواهند گرفت.')
    setShowConsultModal(false)
    setConsultName('')
    setConsultMobile('')
    setConsultTime('')
  }

  // ===== توابع فیلتر و قیمت =====
  const filterByAudience = (productList) => {
    return productList.filter(p => {
      if (!p.audience || p.audience === 'all') return true
      if (p.audience === 'customers' && (userRole === 'customer' || userRole === 'guest')) return true
      if (p.audience === 'partners' && userRole === 'partner') return true
      return false
    })
  }

  const getDisplayPrice = (product) => {
    if (userRole === 'partner' && product.partnerPrice) return product.partnerPrice
    return product.price
  }

  const getFinalPrice = (product) => {
    const displayPrice = getDisplayPrice(product)
    return product.discount
      ? Math.round(displayPrice * (1 - product.discount / 100))
      : displayPrice
  }

  // ===== محصولات ویژه =====
  const specialSaleProducts = filterByAudience(
    products.filter(p => (p.tags && p.tags.includes('فروش ویژه')) || p.discount > 0)
  )
  const newProducts = filterByAudience(
    products.filter(p => p.tags && p.tags.includes('جدید'))
  )
  const bestSellerProducts = filterByAudience(
    products.filter(p => p.tags && p.tags.includes('پرفروش'))
  )
  const todaySaleProducts = userRole === 'partner'
    ? products.filter(p => p.tags && p.tags.includes('فروش امروز'))
    : []

  // ===== اسلایدر اصلی =====
  const [currentSlide, setCurrentSlide] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % sliderImages.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  // ===== کاروسل‌های محصولات =====
  const itemsPerSlide = 4
  const [saleIndex, setSaleIndex] = useState(0)
  const totalSaleSlides = specialSaleProducts.length
  useEffect(() => {
    if (totalSaleSlides === 0) return
    const interval = setInterval(() => {
      setSaleIndex(prev => (prev + 1) % totalSaleSlides)
    }, 4000)
    return () => clearInterval(interval)
  }, [totalSaleSlides])
  const visibleSaleProducts = []
  for (let i = 0; i < itemsPerSlide; i++) {
    if (totalSaleSlides > 0) {
      const idx = (saleIndex + i) % totalSaleSlides
      visibleSaleProducts.push(specialSaleProducts[idx])
    }
  }

  const [newIndex, setNewIndex] = useState(0)
  const totalNewSlides = newProducts.length
  useEffect(() => {
    if (totalNewSlides === 0) return
    const interval = setInterval(() => {
      setNewIndex(prev => (prev + 1) % totalNewSlides)
    }, 4000)
    return () => clearInterval(interval)
  }, [totalNewSlides])
  const visibleNewProducts = []
  for (let i = 0; i < itemsPerSlide; i++) {
    if (totalNewSlides > 0) {
      const idx = (newIndex + i) % totalNewSlides
      visibleNewProducts.push(newProducts[idx])
    }
  }

  const [bestIndex, setBestIndex] = useState(0)
  const totalBestSlides = bestSellerProducts.length
  useEffect(() => {
    if (totalBestSlides <= 4) return
    const interval = setInterval(() => {
      setBestIndex(prev => (prev + 1) % totalBestSlides)
    }, 4000)
    return () => clearInterval(interval)
  }, [totalBestSlides])
  const visibleBestProducts = []
  if (totalBestSlides > 4) {
    for (let i = 0; i < itemsPerSlide; i++) {
      const idx = (bestIndex + i) % totalBestSlides
      visibleBestProducts.push(bestSellerProducts[idx])
    }
  }

  const [todayIndex, setTodayIndex] = useState(0)
  const totalTodaySlides = todaySaleProducts.length
  useEffect(() => {
    if (totalTodaySlides <= 4) return
    const interval = setInterval(() => {
      setTodayIndex(prev => (prev + 1) % totalTodaySlides)
    }, 4000)
    return () => clearInterval(interval)
  }, [totalTodaySlides])
  const visibleTodayProducts = []
  if (totalTodaySlides > 4) {
    for (let i = 0; i < itemsPerSlide; i++) {
      const idx = (todayIndex + i) % totalTodaySlides
      visibleTodayProducts.push(todaySaleProducts[idx])
    }
  }

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
      let img = product.images[0];
      if (img && img.startsWith('http')) return img;
      if (img && img.startsWith('/uploads')) return `http://localhost:5003${img}`;
      if (img) return `http://localhost:5003/uploads/${img}`;
    }
    if (product.image) {
      if (product.image.startsWith('http')) return product.image;
      if (product.image.startsWith('/uploads')) return `http://localhost:5003${product.image}`;
      return `http://localhost:5003/uploads/${product.image}`;
    }
    return 'https://picsum.photos/300/300?random=' + product.id;
  };

  // ===== توابع اسلایدر نظرات =====
  const totalPages = Math.ceil(testimonials.length / 3);
  const visibleTestimonials = testimonials.slice(testimonialIndex, testimonialIndex + 3);
  
  const goToPrev = () => {
    setTestimonialIndex(prev => (prev - 3 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setTestimonialIndex(prev => (prev + 3) % testimonials.length);
  };

  const goToPage = (pageIndex) => {
    setTestimonialIndex((pageIndex * 3) % testimonials.length);
  };

  const currentPage = Math.floor(testimonialIndex / 3);

  const renderStars = (rating) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  // بررسی اینکه آیا برندها باید نمایش داده شوند (فقط برای همکاران و زمانی که برند وجود دارد)
  const showBrandsSection = userRole === 'partner' && brands.length > 0 && !loadingBrands;

  // ===== رندر صفحه =====
  return (
    <>
      {/* هدر اسلایدر */}
      <header className="hero-slider">
        {sliderImages.map((img, idx) => (
          <div
            key={idx}
            className={`slide ${idx === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url('${img}')` }}
          />
        ))}
        <div className="hero-overlay">
          <h1>کاشی و سرامیک آسمان</h1>
          <p>زیبایی و دوام در خانه شما</p>
        </div>
        <div className="slider-dots">
          {sliderImages.map((_, idx) => (
            <span
              key={idx}
              className={`dot ${idx === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
            />
          ))}
        </div>
      </header>

      {/* فروش ویژه */}
      <div className="special-sale-section">
        <div className="section-header-right">
          <h2 className="section-main-title">فروش ویژه</h2>
        </div>
        <section className="offer-section">
          {specialSaleProducts.length === 0 ? (
            <p className="empty-message">هیچ محصول ویژه‌ای یافت نشد.</p>
          ) : (
            <div className="carousel-wrapper">
              <div className="carousel-track">
                {visibleSaleProducts.map((product, idx) => {
                  const displayPrice = getDisplayPrice(product)
                  const finalPrice = getFinalPrice(product)
                  return (
                    <Link to={`/product/${product.id}`} key={`sale-${product.id}-${idx}`} className="offer-card-link carousel-card">
                      <div className="offer-card special-card">
                        <div className="card-image"><img src={getProductImage(product)} alt={product.name} /></div>
                        <h4>{product.name}</h4>
                        {salesMode === 'cart' && (
                          <div className="price-wrapper">
                            {product.discount > 0 && <span className="old-price">{displayPrice.toLocaleString()} تومان</span>}
                            <span className="new-price">{finalPrice.toLocaleString()} تومان</span>
                            {product.discount > 0 && <span className="discount-badge">{product.discount}%</span>}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
              <div className="carousel-dots">
                {Array.from({ length: totalSaleSlides }).map((_, idx) => (
                  <span key={idx} className={`dot ${idx === saleIndex ? 'active' : ''}`} onClick={() => setSaleIndex(idx)} />
                ))}
              </div>
            </div>
          )}
          <div className="see-all-small"><Link to="/products?tag=فروش ویژه">مشاهده همه</Link></div>
        </section>
      </div>

      {/* بخش چرا آسمان؟ */}
      <section className="intro-full">
        <div className="intro-full-container">
          <div className="intro-full-text">
            <h2>چرا کاشی و سرامیک آسمان؟</h2>
            <p className="highlight-box">
              گروه بازرگانی کاشی و سرامیک آسمان از سال ۱۳۹۴ در زمینه تأمین و توزیع
              کاشی و سرامیک فعالیت دارد. با تکیه بر تجربه، خلاقیت و نیروهای متخصص،
              تأمین سریع و باکیفیت محصولات را هدف خود قرار داده است.
            </p>
            <p>دفتر فروش و انبار مرکزی ما در شیراز مستقر است و آماده همکاری با انبوه‌سازان و پروژه‌های بزرگ می‌باشد...</p>
            <p>گروه بازرگانی آسمان ارائه‌دهنده جدیدترین مدل‌های کاشی و سرامیک با قیمت رقابتی و ارسال سریع به سراسر کشور است.</p>
          </div>
          <div className="intro-full-images">
            <img src="/images/brand-1.jpg" alt="نمایش" className="img-front" />
            <img src="/images/brand-2.jpg" alt="نمای داخلی" className="img-back" />
          </div>
        </div>
      </section>

      {/* لیست شرکت‌ها (فقط برای همکاران) */}
      {showBrandsSection && (
        <section className="manufacturers-section">
          <div className="section-header-right">
            <h2 className="section-main-title">شرکت‌های همکار</h2>
            <p className="section-subtitle">برندهای معتبر و باکیفیت</p>
          </div>
          
          <div className="manufacturers-carousel">
            <button 
              className="manufacturer-nav prev" 
              onClick={prevManufacturers}
              aria-label="قبلی"
            >
              ❮
            </button>
            
            <div className="manufacturers-track">
              <div className="manufacturers-grid">
                {visibleManufacturers.map((brand, idx) => (
                  <Link 
                    key={`${brand.name}-${idx}`}
                    to={`/products?manufacturer=${encodeURIComponent(brand.name)}`}
                    className="manufacturer-card"
                  >
                    <div className="manufacturer-card-inner">
                      {brand.logo ? (
                        <img 
                          src={brand.logo} 
                          alt={brand.name} 
                          className="manufacturer-logo"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div className="manufacturer-logo-placeholder" style={{ display: brand.logo ? 'none' : 'flex' }}>
                        🏭
                      </div>
                      <h3 className="manufacturer-name">{brand.name}</h3>
                      {brand.address && (
                        <p className="manufacturer-address">{brand.address.substring(0, 30)}...</p>
                      )}
                      <div className="manufacturer-arrow">←</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            
            <button 
              className="manufacturer-nav next" 
              onClick={nextManufacturers}
              aria-label="بعدی"
            >
              ❯
            </button>
          </div>
          
          {totalManufacturerPages > 1 && (
            <div className="manufacturer-dots">
              {Array.from({ length: totalManufacturerPages }).map((_, idx) => (
                <span 
                  key={idx} 
                  className={`dot ${idx === currentManufacturerPage ? 'active' : ''}`}
                  onClick={() => setManufacturerIndex(idx * manufacturersPerPage)}
                />
              ))}
            </div>
          )}
          
          <div className="see-all-link">
            <Link to="/products">مشاهده همه محصولات ←</Link>
          </div>
        </section>
      )}

      {/* محصولات جدید */}
      <div className="section-title-wrapper"><h2 className="section-title">محصولات جدید</h2></div>
      <section className="offer-section">
        {newProducts.length === 0 ? (
          <p className="empty-message">هیچ محصول جدیدی یافت نشد.</p>
        ) : (
          <div className="carousel-wrapper">
            <div className="carousel-track">
              {visibleNewProducts.map((product, idx) => {
                const displayPrice = getDisplayPrice(product)
                const finalPrice = getFinalPrice(product)
                return (
                  <Link to={`/product/${product.id}`} key={`new-${product.id}-${idx}`} className="offer-card-link carousel-card">
                    <div className="offer-card">
                      <img src={getProductImage(product)} alt={product.name} />
                      <h4>{product.name}</h4>
                      {salesMode === 'cart' && (
                        <>
                          {product.discount > 0 && (
                            <>
                              <span className="old-price">{displayPrice.toLocaleString()} تومان</span>
                              <span className="discount-badge-small">{product.discount}% تخفیف</span>
                            </>
                          )}
                          <span className="new-price">{finalPrice.toLocaleString()} تومان</span>
                        </>
                      )}
                      <div className="tag-new">جدید</div>
                    </div>
                  </Link>
                )
              })}
            </div>
            <div className="carousel-dots">
              {Array.from({ length: totalNewSlides }).map((_, idx) => (
                <span key={idx} className={`dot ${idx === newIndex ? 'active' : ''}`} onClick={() => setNewIndex(idx)} />
              ))}
            </div>
          </div>
        )}
        <div className="see-all-small"><Link to="/products?tag=جدید">مشاهده همه</Link></div>
      </section>

      {/* محصولات پرفروش */}
      <div className="section-title-wrapper"><h2 className="section-title">محصولات پرفروش</h2></div>
      <section className="offer-section">
        {bestSellerProducts.length === 0 ? (
          <p className="empty-message">هیچ محصول پرفروشی یافت نشد.</p>
        ) : bestSellerProducts.length <= 4 ? (
          <div className="offer-row">
            {bestSellerProducts.map(product => {
              const displayPrice = getDisplayPrice(product)
              const finalPrice = getFinalPrice(product)
              return (
                <Link to={`/product/${product.id}`} key={product.id} className="offer-card-link">
                  <div className="offer-card">
                    <img src={getProductImage(product)} alt={product.name} />
                    <h4>{product.name}</h4>
                    {salesMode === 'cart' && (
                      <>
                        {product.discount > 0 && (
                          <>
                            <span className="old-price">{displayPrice.toLocaleString()} تومان</span>
                            <span className="discount-badge-small">{product.discount}% تخفیف</span>
                          </>
                        )}
                        <span className="new-price">{finalPrice.toLocaleString()} تومان</span>
                      </>
                    )}
                    <div className="tag-bestseller">پرفروش</div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="carousel-wrapper">
            <div className="carousel-track">
              {visibleBestProducts.map((product, idx) => {
                const displayPrice = getDisplayPrice(product)
                const finalPrice = getFinalPrice(product)
                return (
                  <Link to={`/product/${product.id}`} key={`best-${product.id}-${idx}`} className="offer-card-link carousel-card">
                    <div className="offer-card">
                      <img src={getProductImage(product)} alt={product.name} />
                      <h4>{product.name}</h4>
                      {salesMode === 'cart' && (
                        <>
                          {product.discount > 0 && (
                            <>
                              <span className="old-price">{displayPrice.toLocaleString()} تومان</span>
                              <span className="discount-badge-small">{product.discount}% تخفیف</span>
                            </>
                          )}
                          <span className="new-price">{finalPrice.toLocaleString()} تومان</span>
                        </>
                      )}
                      <div className="tag-bestseller">پرفروش</div>
                    </div>
                  </Link>
                )
              })}
            </div>
            <div className="carousel-dots">
              {Array.from({ length: totalBestSlides }).map((_, idx) => (
                <span key={idx} className={`dot ${idx === bestIndex ? 'active' : ''}`} onClick={() => setBestIndex(idx)} />
              ))}
            </div>
          </div>
        )}
        <div className="see-all-small"><Link to="/products?tag=پرفروش">مشاهده همه</Link></div>
      </section>

      {/* وبلاگ */}
      {/* ========== بخش وبلاگ با ارتفاع مساوی ========== */}
      <section className="blog-section-new">
        <div className="section-header-right">
          <h2 className="section-main-title">جدیدترین مقالات</h2>
          <p className="section-subtitle">مطالب تخصصی در دنیای کاشی و سرامیک</p>
        </div>
        
        {blogPosts.length === 0 ? (
          <p className="empty-message">هیچ مقاله‌ای برای نمایش وجود ندارد.</p>
        ) : (
          <div className="blog-layout-new">
            {/* سمت راست - مقاله اول (بزرگ) */}
            <div className="blog-right-column-new">
              {blogPosts.slice(0, 1).map(post => (
                <Link to={`/blog/${post.slug}`} key={post.id} className="blog-card-link-new full-height">
                  <article className="blog-card-large">
                    <div className="blog-card-large-image">
                      {post.image ? (
                        <img src={post.image} alt={post.title} />
                      ) : (
                        <div className="blog-card-placeholder">📷</div>
                      )}
                    </div>
                    <div className="blog-card-large-content">
                      <h3>{post.title}</h3>
                      <p className="blog-excerpt">{post.excerpt?.substring(0, 120)}...</p>
                      <div className="blog-meta">
                        <span>📅 {new Date(post.created_at).toLocaleDateString('fa-IR')}</span>
                        <span className="read-more">بیشتر بخوانید →</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {/* سمت چپ - مقاله دوم و سوم (دو تا کارت کوچک) */}
            <div className="blog-left-column-new">
              {blogPosts.slice(1, 3).map(post => (
                <Link to={`/blog/${post.slug}`} key={post.id} className="blog-card-link-new">
                  <article className="blog-card-small">
                    <div className="blog-card-small-image">
                      {post.image ? (
                        <img src={post.image} alt={post.title} />
                      ) : (
                        <div className="blog-card-placeholder-small">📷</div>
                      )}
                    </div>
                    <div className="blog-card-small-content">
                      <h4>{post.title}</h4>
                      <p className="blog-excerpt-small">{post.excerpt?.substring(0, 80)}...</p>
                      <div className="blog-meta-small">
                        <span>📅 {new Date(post.created_at).toLocaleDateString('fa-IR')}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        )}
        
        <div className="see-all-link">
          <Link to="/blog">مشاهده همه مقالات ←</Link>
        </div>
      </section>

      {/* ========== اسلایدر نظرات مشتریان ========== */}
      <section className="testimonials-section">
        <div className="section-header-right">
          <h2 className="section-main-title">نظرات مشتریان</h2>
          <p className="section-subtitle">تجربه همکاری با آسمان</p>
        </div>
        
        <div className="testimonials-slider">
          <button className="testimonial-nav prev" onClick={goToPrev}>❮</button>
          
          <div className="testimonials-track">
            {visibleTestimonials.map((testimonial) => (
              <div key={testimonial.id} className="testimonial-card">
                <div className="testimonial-header">
                  <div className="testimonial-author-info">
                    <h3 className="testimonial-name">{testimonial.name}</h3>
                    <p className="testimonial-position">{testimonial.position}</p>
                  </div>
                  <div className="testimonial-stars">
                    {renderStars(testimonial.rating)}
                  </div>
                </div>
                
                <div className="testimonial-quote-icon">“</div>
                
                <p className="testimonial-text">{testimonial.text}</p>
              </div>
            ))}
          </div>
          
          <button className="testimonial-nav next" onClick={goToNext}>❯</button>
        </div>
        
        {totalPages > 1 && (
          <div className="testimonial-dots">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <span 
                key={idx} 
                className={`dot ${idx === currentPage ? 'active' : ''}`} 
                onClick={() => goToPage(idx)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="cta">
        <Link to="/products">مشاهده تمامی محصولات</Link>
      </div>

      {/* ===== دکمه شناور + بالون اطلاع‌رسانی ===== */}
      <div className="floating-container">
        {!hasClickedConsult && (
          <div className="info-bubble">
            <div className="info-bubble-content">
              <div className="info-bubble-icon">💬</div>
              <p>جهت پاسخگویی سریع به سوالات با کارشناسان ما در ارتباط باشید.</p>
            </div>
            <div className="bubble-arrow"></div>
          </div>
        )}
        <div className="floating-support-btn" onClick={() => {
          setHasClickedConsult(true);
          setShowConsultModal(true);
        }}>
          <span className="support-icon">🎧</span>
          <span className="support-text">مشاوره رایگان</span>
        </div>
      </div>

      {/* ===== مودال فرم مشاوره ===== */}
      {showConsultModal && (
        <div className="modal-overlay" onClick={() => setShowConsultModal(false)}>
          <div className="consult-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowConsultModal(false)}>✖</button>
            <div className="consult-header">
              <h2>دریافت مشاوره تخصصی</h2>
              <span className="consult-free-badge">رایگان</span>
            </div>
            <form onSubmit={handleConsultSubmit}>
              <div className="form-group">
                <label>نام و نام خانوادگی</label>
                <input type="text" value={consultName} onChange={(e) => setConsultName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>شماره تماس</label>
                <input type="tel" value={consultMobile} onChange={(e) => setConsultMobile(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>بازه زمانی تماس</label>
                <div className="time-options">
                  <label className={`time-option ${consultTime === '9-12' ? 'selected' : ''}`}>
                    <input type="radio" name="consultTime" value="9-12" checked={consultTime === '9-12'} onChange={(e) => setConsultTime(e.target.value)} />
                    <span>🕘 ۹ تا ۱۲</span>
                  </label>
                  <label className={`time-option ${consultTime === '13-16' ? 'selected' : ''}`}>
                    <input type="radio" name="consultTime" value="13-16" checked={consultTime === '13-16'} onChange={(e) => setConsultTime(e.target.value)} />
                    <span>🕐 ۱۳ تا ۱۶</span>
                  </label>
                  <label className={`time-option ${consultTime === 'anytime' ? 'selected' : ''}`}>
                    <input type="radio" name="consultTime" value="anytime" checked={consultTime === 'anytime'} onChange={(e) => setConsultTime(e.target.value)} />
                    <span>⚡ در اسرع وقت</span>
                  </label>
                </div>
              </div>
              <button type="submit" className="consult-submit-btn">ثبت درخواست مشاوره</button>
            </form>
            <p className="consult-note">کارشناسان ما در زمان انتخابی با شما تماس می‌گیرند. مشاوره کاملاً رایگان است.</p>
          </div>
        </div>
      )}
    </>
  )
}

export default LandingPage