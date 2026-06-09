// frontend/src/components/common/LoadingSpinner.jsx
import './LoadingSpinner.css';

const LoadingSpinner = ({ fullPage }) => {
  return (
    <div className={fullPage ? 'spinner-fullpage' : ''}>
      <div className="spinner spinner-medium"></div>
      <p>در حال بارگذاری...</p>
    </div>
  );
};

export default LoadingSpinner;