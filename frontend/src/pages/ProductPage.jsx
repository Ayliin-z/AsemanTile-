import { useState, useEffect } from 'react'
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom'  // useNavigate را هم اضافه کنید
import { getProductById, getProducts } from '../utils/storage'
import { getCurrentUserRole } from '../utils/customerAuth'
import { getSiteSettings } from '../utils/siteSettings'
import './ProductPage.css'


const ProductPage = () => {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [similarProducts, setSimilarProducts] = useState([])
  const [selectedImage, setSelectedImage] = useState(0)
  const [salesMode, setSalesMode] = useState('cart')
  const [loading, setLoading] = useState(true)
  const userRole = getCurrentUserRole()
  const [liked, setLiked] = useState(false)
  const [wishlistId, setWishlistId] = useState(null)
  const currentUserId = JSON.parse(localStorage.getItem('aseman_customer_auth') || '{}')?.id

  const [showPriceModal, setShowPriceModal] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState(localStorage.getItem('viewed_price_phone') || '')
  const [priceUnlocked, setPriceUnlocked] = useState(!!localStorage.getItem('viewed_price_phone'))

  // اضافه کن به state های اولیه
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // تابع باز کردن مودال مقدار (به جای prompt)
  const openQuantityModal = () => {
    setSelectedQuantity(1);
    setShowQuantityModal(true);
  };

  // آیا کاربر لاگین کرده است؟ (مشتری یا همکار)
  const isLoggedIn = userRole === 'customer' || userRole === 'partner'

  // توابع محاسبه قیمت
  const getDisplayPrice = () => {
    if (userRole === 'partner' && product?.partnerPrice) return product.partnerPrice
    return product?.price || 0
  }

  const getFinalPrice = () => {
    const displayPrice = getDisplayPrice()
    return product?.discount ? Math.round(displayPrice * (1 - product.discount / 100)) : displayPrice
  }


  const getInquiryLink = () => {
    if (userRole === 'partner') {
      return '/partner?tab=support';
    }
    return '/contact';
  };
  // ========== تابع افزودن به سبد خرید (عمومی برای همه) ==========
  const addToCart = (quantity = 1) => {
    if (!product) return
    
    const finalPriceValue = getFinalPrice()
    
    const cartItem = {
      id: product.id,
      name: product.name,
      price: finalPriceValue,
      displayPrice: getDisplayPrice(),
      image: getImageUrl(images[0]),
      quantity: quantity
    }
    
    // ذخیره در localStorage
    const savedCart = localStorage.getItem('aseman_cart')
    let cart = savedCart ? JSON.parse(savedCart) : []
    
    const existingIndex = cart.findIndex(item => item.id === product.id)
    if (existingIndex !== -1) {
      cart[existingIndex].quantity += quantity
    } else {
      cart.push(cartItem)
    }
    
    localStorage.setItem('aseman_cart', JSON.stringify(cart))
    
    // ارسال event برای به‌روزرسانی آیکون سبد در هدر
    window.dispatchEvent(new Event('storage'))
    
    if (finalPriceValue > 0) {
      alert(`${product.name} با مقدار ${quantity} متر مربع به سبد خرید اضافه شد\nقیمت: ${finalPriceValue.toLocaleString()} تومان`)
    } else {
      alert(`${product.name} با مقدار ${quantity} متر مربع به سبد خرید اضافه شد (قیمت: جهت استعلام)`)
    }
  }

  // تابع برای همکاران (پرسیدن متراژ)
  const addToCartForPartner = () => {
    const quantity = prompt('متراژ مورد نظر را وارد کنید (متر مربع):', '1')
    if (quantity && !isNaN(quantity) && Number(quantity) > 0) {
      addToCart(Number(quantity))
    }
  }

  // بارگذاری اطلاعات محصول
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const found = await getProductById(parseInt(id))
        if (found) {
          setProduct(found)
          try {
            const res = await fetch('/api/product-templates')
            const templates = await res.json()
            if (templates && Array.isArray(templates)) {
              const { generateProductDescription } = await import('../utils/productTemplates.js')
              const autoDescription = generateProductDescription(found, templates)
              if (!found.fullDescription || found.fullDescription === '') {
                found.fullDescription = autoDescription
              }
            }
          } catch (err) {
            console.error('Error loading templates:', err)
          }
          await loadSimilarProducts(found)
        }
        const settings = await getSiteSettings()
        setSalesMode(settings.salesMode)
      } catch (err) {
        console.error('Error loading product:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  // بارگذاری محصولات مشابه
  const loadSimilarProducts = async (currentProduct) => {
    try {
      const allProducts = await getProducts()
      const similar = allProducts.filter(p => {
        if (p.id === currentProduct.id) return false
        let match = false
        if (currentProduct.glaze && p.glaze && p.glaze === currentProduct.glaze) match = true
        if (currentProduct.color && p.color && p.color === currentProduct.color) match = true
        if (currentProduct.size && p.size && p.size === currentProduct.size) match = true
        return match
      })
      setSimilarProducts(similar.slice(0, 4))
    } catch (err) {
      console.error('Error loading similar products:', err)
      setSimilarProducts([])
    }
  }

  // چک کردن وضعیت علاقه‌مندی
  useEffect(() => {
    if (!currentUserId || !product?.id || !isLoggedIn) return
    fetch(`/api/wishlist/check/${currentUserId}/${product.id}`)
      .then(r => r.json())
      .then(d => { if (d.success) { setLiked(d.liked); setWishlistId(d.id) } })
      .catch(err => console.error('Wishlist check failed:', err))
  }, [currentUserId, product?.id, isLoggedIn])

  const getImageUrl = (img) => {
    if (!img) return '/images/placeholder.jpg'
    if (img.startsWith('http')) return img
    if (img.startsWith('/uploads')) return `${img}`
    return `/uploads/${img}`
  }

  // لیست تصاویر
  const images = product?.images?.length > 0
    ? product.images
    : product?.image
      ? [product.image]
      : ['/images/placeholder.jpg']

  // عکس محصول مشابه
  const getSimilarProductImage = (product) => {
    if (product.images && product.images.length > 0) return getImageUrl(product.images[0])
    return '/images/placeholder.jpg'
  }

  // قیمت محصول مشابه
  const getSimilarProductPrice = (product) => {
    const dispPrice = (userRole === 'partner' && product.partnerPrice) ? product.partnerPrice : product.price
    return product.discount
      ? Math.round(dispPrice * (1 - product.discount / 100))
      : dispPrice
  }

  // تابع افزودن/حذف علاقه‌مندی
  const toggleWishlist = async () => {
    if (!currentUserId || !isLoggedIn) return
    if (liked) {
      await fetch(`/api/wishlist/${wishlistId}`, { method: 'DELETE' })
      setLiked(false)
      setWishlistId(null)
    } else {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId, product_id: product.id })
      })
      const data = await res.json()
      if (data.success) {
        setLiked(true)
        setWishlistId(data.data.id)
      } else {
        alert(data.error || 'خطا')
      }
    }
  }

  if (loading) {
    return (
      <div className="product-loading">
        <div className="loading-spinner"></div>
        <p>در حال بارگذاری محصول...</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="product-not-found">
        <h2>محصول یافت نشد</h2>
        <Link to="/">بازگشت به صفحه اصلی</Link>
      </div>
    )
  }

  // بررسی دسترسی
  const isAllowed = () => {
    if (!product.audience || product.audience === 'all') return true
    if (product.audience === 'customers' && (userRole === 'customer' || userRole === 'guest')) return true
    if (product.audience === 'partners' && userRole === 'partner') return true
    return false
  }

  if (!isAllowed()) {
    return <Navigate to="/" replace />
  }

  const displayPrice = (userRole === 'partner' && product.partnerPrice)
    ? product.partnerPrice
    : product.price

  const finalPrice = product.discount
    ? Math.round(displayPrice * (1 - product.discount / 100))
    : displayPrice

  return (
    <div className="product-page">
      <div className="container">
        <Link to="/products" className="back-link">← بازگشت به محصولات</Link>

        <div className="product-layout">
          <div className="gallery-box">
            <div className="main-image-wrapper">
              <img 
                src={getImageUrl(images[selectedImage])} 
                alt={product.name} 
                className="main-image"
                onError={(e) => {
                  e.target.src = '/images/placeholder.jpg'
                }}
              />
            </div>
            {images.length > 1 && (
              <div className="thumbnails">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`thumbnail ${selectedImage === idx ? 'active' : ''}`}
                    onClick={() => setSelectedImage(idx)}
                  >
                    <img src={getImageUrl(img)} alt={`تصویر ${idx + 1}`}
                      onError={(e) => { e.target.src = '/images/placeholder.jpg' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="info-box">
            <div className="product-title-wrapper">
              <h1 className="product-title">{product.name}</h1>
              {isLoggedIn && (
                <button
                  className={`wishlist-heart-btn ${liked ? 'liked' : ''}`}
                  onClick={toggleWishlist}
                  title={liked ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
                >
                  {liked ? '❤️' : '🤍'}
                </button>
              )}
            </div>
            
            {product.grade && (
              <div className="product-grade">
                <span className="grade-label">درجه:</span>
                <span className="grade-value">{product.grade}</span>
              </div>
            )}

            {/* نمایش قیمت و دکمه سفارش */}
            {salesMode === 'cart' && (
              <div className="price-section">
                {userRole === 'guest' && !priceUnlocked ? (
                  <button 
                    className="btn-primary"
                    onClick={() => setShowPriceModal(true)}
                    style={{ padding: '10px 25px', fontSize: '16px', width: '100%' }}
                  >
                    🔒 مشاهده قیمت
                  </button>
                ) : (
                  <>
                    {finalPrice > 0 ? (
                      <div className="price-wrapper">
                        {product.discount > 0 && (
                          <span className="old-price">{displayPrice.toLocaleString()} تومان</span>
                        )}
                        <span className="final-price">{finalPrice.toLocaleString()} تومان</span>
                        {product.discount > 0 && (
                          <span className="discount-tag">{product.discount}% تخفیف</span>
                        )}
                      </div>
                    ) : (
                      <Link to={getInquiryLink()} className="price-inquiry-box" style={{ textDecoration: 'none', display: 'block' }}>
                        <span className="inquiry-icon">📞</span>
                        <span className="inquiry-text">جهت استعلام قیمت با کارشناسان ما تماس بگیرید</span>
                      </Link>
                    )}
                    
                    {/* دکمه درخواست سفارش */}
                    <button 
                      className="btn-primary order-btn"
                      onClick={openQuantityModal}  // ← به جای addToCartForPartner
                    >
                      🛒 درخواست سفارش
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="specs-card">
              <h3>مشخصات فنی</h3>
              <table className="specs-table">
                <tbody>
                  <tr>
                    <th>درجه</th>
                    <td>{product.grade || '—'}</td>
                  </tr>
                  <tr>
                    <th>سایز</th>
                    <td>{product.size || '—'}</td>
                  </tr>
                  <tr>
                    <th>نوع لعاب</th>
                    <td>{product.glaze || '—'}</td>
                  </tr>
                  <tr>
                    <th>رنگ</th>
                    <td>{product.color || '—'}</td>
                  </tr>
                  <tr>
                    <th>نوع خاک</th>
                    <td>{product.glazeType || '—'}</td>
                  </tr>
                  
                  {userRole === 'partner' && (
                    <tr>
                      <th>موجودی</th>
                      <td style={{ color: '#1c7385', fontWeight: 'bold' }}>
                        📞 برای استعلام موجودی تماس بگیرید
                       </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {product.fullDescription && (
          <div className="full-description-box">
            <div dangerouslySetInnerHTML={{ __html: product.fullDescription }} />
          </div>
        )}

        {similarProducts.length > 0 && (
          <div className="similar-products">
            <h3>محصولات مشابه</h3>
            <div className="similar-products-grid">
              {similarProducts.map(similar => {
                const similarPrice = getSimilarProductPrice(similar)
                return (
                  <Link to={`/product/${similar.id}`} key={similar.id} className="similar-product-card">
                    <div className="similar-product-image">
                      <img src={getSimilarProductImage(similar)} alt={similar.name}
                        onError={(e) => { e.target.src = '/images/placeholder.jpg' }}
                      />
                    </div>
                    <div className="similar-product-info">
                      <h4>{similar.name}</h4>
                      <div className="similar-badges">
                        <span className="similar-badge">📏 {similar.size || '-'}</span>
                        <span className="similar-badge">✨ {similar.glaze || '-'}</span>
                      </div>
                      {salesMode === 'cart' && (
                        <div className="similar-price">
                          {similar.discount > 0 && (
                            <span className="similar-old-price">{similarPrice.toLocaleString()} تومان</span>
                          )}
                          <span className="similar-new-price">{similarPrice.toLocaleString()} تومان</span>
                        </div>
                      )}
                    </div>
                    {similar.discount > 0 && (
                      <span className="similar-discount-badge">{similar.discount}%</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
        


      {/* مودال سفارشی دریافت متراژ */}
      {showQuantityModal && (
        <div className="modal-overlay" onClick={() => setShowQuantityModal(false)}>
          <div className="quantity-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ افزودن به سبد خرید</h3>
              <button className="modal-close" onClick={() => setShowQuantityModal(false)}>✖</button>
            </div>
            <div className="modal-body">
              <p className="product-name">{product.name}</p>
              <div className="quantity-input-group">
                <label>متراژ مورد نیاز (متر مربع):</label>
                <div className="quantity-control">
                  <button onClick={() => setSelectedQuantity(prev => Math.max(1, prev - 1))}>-</button>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <button onClick={() => setSelectedQuantity(prev => prev + 1)}>+</button>
                </div>
              </div>
              {getFinalPrice() > 0 && (
                <p className="price-info">قیمت هر متر مربع: {getFinalPrice().toLocaleString()} تومان</p>
              )}
            </div>
            <div className="modal-footer">
              {/* دکمه انصراف حذف شد */}
              <button 
                className="btn-primary" 
                onClick={() => {
                  addToCart(selectedQuantity);
                  setShowQuantityModal(false);
                }}
              >
                ➕ افزودن به سبد خرید
              </button>
            </div>
          </div>
        </div>
      )}


      {/* مودال دریافت شماره موبایل */}
      {showPriceModal && (
        <div className="modal-overlay" onClick={() => setShowPriceModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'white', padding: 25, borderRadius: 16, maxWidth: 400, margin: 'auto', marginTop: '10%', textAlign: 'center' }}>
            <h3>مشاهده قیمت</h3>
            <p style={{ margin: '15px 0', color: '#555' }}>برای مشاهده قیمت، لطفاً شماره همراه خود را وارد کنید:</p>
            <input
              type="tel"
              placeholder="شماره موبایل (مثلاً ۰۹۱۲۳۴۵۶۷۸۹)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                margin: '10px 0',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 16,
                direction: 'ltr',
                textAlign: 'center'
              }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 15 }}>
              <button
                className="btn-primary"
                onClick={async () => {
                  if (!phoneNumber || phoneNumber.length < 10) {
                    alert('لطفاً یک شماره موبایل معتبر وارد کنید')
                    return
                  }
                  localStorage.setItem('viewed_price_phone', phoneNumber)
                  setPriceUnlocked(true)
                  
                  try {
                    await fetch('/api/price-requests', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ product_id: product.id, mobile: phoneNumber })
                    })
                  } catch (err) {
                    console.error('خطا در ثبت شماره:', err)
                  }
                  
                  setShowPriceModal(false)
                }}
              >
                ✅ مشاهده قیمت
              </button>
              <button className="btn-secondary" onClick={() => setShowPriceModal(false)}>انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductPage