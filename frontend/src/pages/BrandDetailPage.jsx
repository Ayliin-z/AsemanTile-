import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProducts } from '../utils/storage';
import { getCurrentUserRole } from '../utils/customerAuth';
import './BrandDetailPage.css';

const BrandDetailPage = () => {
  const { brandId } = useParams();
  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const userRole = getCurrentUserRole();

  useEffect(() => {
    const fetchBrandAndProducts = async () => {
      try {
        const brandRes = await fetch(`http://api.asemantile.com/api/brands/${brandId}`);
        const brandData = await brandRes.json();
        if (brandData.success) {
          setBrand(brandData.data);
          const allProducts = await getProducts();
          const filtered = allProducts.filter(p => p.manufacturer === brandData.data.name);
          setProducts(filtered);
        } else {
          throw new Error(brandData.error);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrandAndProducts();
  }, [brandId]);

  if (loading) return <div className="loading">در حال بارگذاری...</div>;
  if (!brand) return <div className="error">برند مورد نظر یافت نشد.</div>;

  const getDisplayPrice = (product) => {
    if (userRole === 'partner' && product.partnerPrice) return product.partnerPrice;
    return product.price;
  };
  const getFinalPrice = (product) => {
    const displayPrice = getDisplayPrice(product);
    return product.discount ? Math.round(displayPrice * (1 - product.discount / 100)) : displayPrice;
  };

  return (
    <div className="brand-detail-page">
      <div className="container">
        <Link to="/" className="back-link">← بازگشت به صفحه اصلی</Link>
        <div className="brand-header">
          {brand.logo && <img src={brand.logo} alt={brand.name} className="brand-logo" />}
          <h1>{brand.name}</h1>
        </div>
        <div className="brand-info">
          {brand.address && <p><strong>آدرس:</strong> {brand.address}</p>}
          {brand.phone && <p><strong>تلفن:</strong> {brand.phone}</p>}
          {brand.email && <p><strong>ایمیل:</strong> {brand.email}</p>}
          {brand.website && <p><strong>وب‌سایت:</strong> <a href={brand.website} target="_blank" rel="noopener noreferrer">{brand.website}</a></p>}
          {brand.description && <div className="brand-description"><h3>درباره کارخانه</h3><p>{brand.description}</p></div>}
        </div>
        <h2 className="products-title">محصولات {brand.name}</h2>
        <div className="products-grid">
          {products.length === 0 && <p>هیچ محصولی برای این برند یافت نشد.</p>}
          {products.map(product => (
            <Link to={`/product/${product.id}`} key={product.id} className="product-card-link">
              <div className="product-card">
                <img src={product.images?.[0] || '/images/placeholder.jpg'} alt={product.name} />
                <h3>{product.name}</h3>
                <div className="product-price">{getFinalPrice(product).toLocaleString()} تومان</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BrandDetailPage;