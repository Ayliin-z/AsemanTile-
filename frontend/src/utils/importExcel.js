import { getProductByCode, addProduct, updateProduct } from './storage';

export const importProductsFromExcel = (file) => {
  return new Promise((resolve, reject) => {
    if (!window.XLSX) {
      reject(new Error('کتابخانه Excel بارگذاری نشده است'));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = window.XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          reject(new Error('فایل خالی است'));
          return;
        }

        const results = { added: [], updated: [], errors: [] };

        for (const row of jsonData) {
          try {
            const productCodeRaw = row['کد محصول'] || row['productCode'] || row['productcode'] || '';
            const productCode = productCodeRaw.toString().trim();
            
            // اگر کد محصول خالی بود، رد کن
            if (!productCode) {
              results.errors.push({ row, error: 'کد محصول خالی است - سطر نادیده گرفته شد' });
              continue;
            }

            const name = row['نام'] || row['name'] || '';
            if (!name) {
              results.errors.push({ row, error: 'نام محصول الزامی است' });
              continue;
            }

            // پردازش مقادیر عددی
            const price = Number(row['قیمت'] || row['price'] || 0);
            const partnerPrice = Number(row['قیمت همکار'] || row['partnerPrice'] || 0);
            const discount = Number(row['تخفیف'] || row['discount'] || 0);
            const stock = Number(row['موجودی'] || row['stock'] || row['متراژ موجودی'] || 0);

            // آماده‌سازی داده‌ها
            const productData = {
              productCode: productCode,
              grade: row['درجه'] || row['grade'] || '',
              name: name,
              price: isNaN(price) ? 0 : price,
              partnerPrice: isNaN(partnerPrice) ? 0 : partnerPrice,
              discount: isNaN(discount) ? 0 : discount,
              stock: isNaN(stock) ? 0 : stock,
              description: row['توضیحات'] || row['description'] || '',
              manufacturer: row['شرکت سازنده'] || row['manufacturer'] || '',
              glazeType: row['نوع خاک'] || row['glazeType'] || '',
              glaze: row['نوع لعاب'] || row['glaze'] || '',
              suitableFor: row['مناسب برای'] || row['suitableFor'] || '',
              category: row['دسته‌بندی'] || row['category'] || '',
              size: row['سایز'] || row['size'] || '',
              color: row['رنگ'] || row['color'] || '',
              fullDescription: row['توضیحات کامل'] || row['fullDescription'] || '',
              tags: [],
              audience: row['مخاطب'] || row['audience'] || 'all',
              images: []
            };

            // پردازش تگ‌ها
            const tagsRaw = row['تگ‌ها'] || row['tags'];
            if (tagsRaw && typeof tagsRaw === 'string') {
              productData.tags = tagsRaw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
            }

            // پردازش تصاویر
            const imagesRaw = row['تصاویر'] || row['images'];
            if (imagesRaw && typeof imagesRaw === 'string') {
              productData.images = imagesRaw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
            }

            // بررسی وجود محصول
            const existing = await getProductByCode(productCode);
            
            if (existing) {
              // به‌روزرسانی بدون تغییر کد محصول
              await updateProduct(existing.id, productData);
              results.updated.push({ productCode, name: productData.name });
            } else {
              // افزودن محصول جدید
              await addProduct(productData);
              results.added.push({ productCode, name: productData.name });
            }
          } catch (err) {
            console.error('خطا در سطر:', row, err);
            results.errors.push({ row, error: err.message });
          }
        }

        resolve(results);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};