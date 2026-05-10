// frontend/src/pages/BlogPostPage.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './BlogPostPage.css';

const BlogPostPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/blog/slug/${slug}`)
      .then(res => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('پستی با این آدرس یافت نشد');
          throw new Error('خطا در ارتباط با سرور');
        }
        return res.json();
      })
      .then(data => {
        setPost(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <LoadingSpinner fullPage />;
  if (error) return <div className="error-message">{error}</div>;
  if (!post) return <div className="not-found">مقاله مورد نظر یافت نشد.</div>;

  return (
    <div className="blog-post-page">
      <div className="container">
        {/* به جای Breadcrumb از یک لینک ساده استفاده می‌کنیم */}
        <div className="breadcrumb-simple">
          <Link to="/blog">← بازگشت به لیست مقالات</Link>
        </div>
        
        <article className="blog-post">
          <h1>{post.title}</h1>
          <div className="post-meta">
            📅 {new Date(post.created_at).toLocaleDateString('fa-IR')}
          </div>
          
          {post.image && (
            <div className="post-image">
              <img src={post.image} alt={post.title} />
            </div>
          )}
          
          <div 
            className="post-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </div>
    </div>
  );
};

export default BlogPostPage;