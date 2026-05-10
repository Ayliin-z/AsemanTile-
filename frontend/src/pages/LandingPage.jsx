// frontend/src/pages/LandingPage.jsx
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../utils/storage'
import { getCurrentUserRole } from '../utils/customerAuth'
import { getEnabledBrands } from '../utils/brands'
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
  }
];

const LandingPage = () => {
  const [products, setProducts] = useState([])
  const [salesMode, setSalesMode] = useState('cart')
  const userRole = getCurrentUserRole()
  const [blogPosts, setBlogPosts] = useState([])
  const [availableBrands, setAvailableBrands] = useState([])
  useEffect(() => {
    if (userRole === 'partner') {
      getEnabledBrands().then(brands => setAvailableBrands(brands))
    } else {
      setAvailableBrands([])
    }
  }, [userRole])
  const [showConsultModal, setShowConsultModal] = useState(false)
  const [consultName, setConsultName] = useState('')
  const [consultMobile, setConsultMobile] = useState('')
  const [consultTime, setConsultTime] = useState('')
  
  // ===== State برای اسلایدر نظرات =====
  const [testimonials] = useState(initialTestimonials)
  const [testimonialIndex, setTestimonialIndex] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(3)
  
  // ===== State برای بالون اطلاع‌رسانی (بعد از کلیک ناپدید شود) =====
  const [hasClickedConsult, setHasClickedConsult] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      const prods = await getProducts();
      setProducts(prods);
      const settings = await getSiteSettings();
      setSalesMode(settings.salesMode);
      const posts = await getBlogPosts(true);
      setBlogPosts(posts);
    };
    loadData();
  }, []);

  // تنظیم تعداد آیتم در هر اسلاید بر اساس عرض صفحه
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

  // ===== محصولات ویژه (فروش ویژه، جدید، پرفروش، فروش امروز) =====
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
    if (product.images && product.images.length > 0) return product.images[0]
    if (product.image) return product.image
    return 'https://picsum.photos/300/300?random=' + product.id
  }

  // ===== توابع اسلایدر نظرات =====
  const renderStars = (rating) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };
  const totalPages = Math.ceil(testimonials.length / itemsPerPage);
  const currentPage = Math.floor(testimonialIndex / itemsPerPage);
  const visibleTestimonials = testimonials.slice(testimonialIndex, testimonialIndex + itemsPerPage);
  const goToPrev = () => {
    setTestimonialIndex(prev => {
      const newIndex = prev - itemsPerPage;
      return newIndex < 0 ? Math.max(0, testimonials.length - itemsPerPage) : newIndex;
    });
  };
  const goToNext = () => {
    setTestimonialIndex(prev => {
      const newIndex = prev + itemsPerPage;
      return newIndex >= testimonials.length ? 0 : newIndex;
    });
  };
  const goToPage = (pageIndex) => {
    setTestimonialIndex(pageIndex * itemsPerPage);
  };

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
      {userRole === 'partner' && availableBrands.length > 0 && (
        <section className="manufacturers-section">
          <div className="section-header-right"><h2 className="section-main-title">لیست شرکت‌ها</h2></div>
          <div className="manufacturers-grid">
            {availableBrands.map(brand => (
              <Link key={brand} to={`/products?manufacturer=${encodeURIComponent(brand)}`} className="manufacturer-card">
                <span className="manufacturer-name">{brand}</span><span className="manufacturer-arrow">←</span>
              </Link>
            ))}
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
      <section className="blog-section">
        <div className="section-title-wrapper"><h2 className="section-title">جدیدترین مقالات</h2></div>
        {blogPosts.length === 0 ? (
          <p className="empty-message">هیچ مقاله‌ای برای نمایش وجود ندارد.</p>
        ) : (
          <div className="blog-layout">
            <div className="blog-right-column">
              {blogPosts.slice(0,1).map(post => (
                <Link to={`/blog/${post.slug}`} key={post.id} className="blog-card-link full-height">
                  <article className="blog-card large-card">
                    {post.image && <img src={post.image} alt={post.title} className="blog-card-img" />}
                    <div className="blog-content">
                      <h3>{post.title}</h3>
                      <p className="blog-excerpt">{post.excerpt}</p>
                      <div className="blog-meta"><span>📅 {new Date(post.created_at).toLocaleDateString('fa-IR')}</span><span>{post.comments || 0} دیدگاه</span></div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
            <div className="blog-left-column">
              {blogPosts.slice(1,3).map(post => (
                <Link to={`/blog/${post.slug}`} key={post.id} className="blog-card-link">
                  <article className="blog-card small-card">
                    {post.image && <img src={post.image} alt={post.title} className="blog-card-img" />}
                    <div className="blog-content">
                      <h3>{post.title}</h3>
                      <p className="blog-excerpt">{post.excerpt?.substring(0,100)}...</p>
                      <div className="blog-meta"><span>📅 {new Date(post.created_at).toLocaleDateString('fa-IR')}</span><span>{post.comments || 0} دیدگاه</span></div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* اسلایدر نظرات مشتریان */}
      <section className="testimonials-section">
        <div className="section-header-right">
          <h2 className="section-main-title">نظرات مشتریان</h2>
          <p className="section-subtitle">آنچه دیگران درباره ما می‌گویند</p>
        </div>
        <div className="testimonials-slider">
          <button className="testimonial-nav prev" onClick={goToPrev}>❮</button>
          <div className="testimonials-track">
            {visibleTestimonials.map(testimonial => (
              <div key={testimonial.id} className="testimonial-card">
                <div className="testimonial-avatar"><img src={testimonial.avatar} alt={testimonial.name} /></div>
                <div className="testimonial-content">
                  <div className="testimonial-stars">{renderStars(testimonial.rating)}</div>
                  <p className="testimonial-text">“{testimonial.text}”</p>
                  <div className="testimonial-author"><strong>{testimonial.name}</strong><span>{testimonial.position}</span></div>
                </div>
              </div>
            ))}
          </div>
          <button className="testimonial-nav next" onClick={goToNext}>❯</button>
        </div>
        {totalPages > 1 && (
          <div className="testimonial-dots">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <span key={idx} className={`dot ${idx === currentPage ? 'active' : ''}`} onClick={() => goToPage(idx)} />
            ))}
          </div>
        )}
      </section>

      <div className="cta">
        <Link to="/products">مشاهده تمامی محصولات</Link>
      </div>

      {/* ===== دکمه شناور + بالون اطلاع‌رسانی ===== */}
      <div className="floating-container">
        {/* بالون فقط قبل از کلیک روی دکمه نشان داده می‌شود */}
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
          setHasClickedConsult(true);   // با کلیک، بالون حذف می‌شود
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