# BStore Frontend

BStore Frontend là giao diện web cho hệ thống bán hàng thiết bị công nghệ. Dự án được xây dựng bằng React và Vite, kết nối với REST API backend để hiển thị sản phẩm, xử lý đăng nhập, giỏ hàng, thanh toán và các chức năng quản trị.

## Tính năng chính

- Trang người dùng: trang chủ, danh sách sản phẩm, chi tiết sản phẩm, sản phẩm khuyến mãi, sản phẩm mới, tin tức, liên hệ và các trang chính sách.
- Tìm kiếm, lọc và sắp xếp sản phẩm theo danh mục, thương hiệu, trạng thái khuyến mãi hoặc thời gian tạo.
- Đăng ký, đăng nhập và lưu phiên đăng nhập bằng token.
- Giỏ hàng và thanh toán cho khách hàng đã đăng nhập.
- Khu vực quản trị được bảo vệ theo vai trò admin.
- Quản trị sản phẩm, danh mục, thương hiệu, banner, tồn kho, đơn hàng, người dùng và vai trò.
- Upload hình ảnh, soạn mô tả sản phẩm bằng CKEditor và hiển thị thông báo thao tác qua toast.
- Cấu hình API bằng biến môi trường, hỗ trợ build production với Docker và Nginx.

## Công nghệ sử dụng

- React 19
- Vite 8
- React Router DOM 7
- Tailwind CSS 4
- Axios
- Swiper
- CKEditor 5
- ESLint
- Docker, Nginx

## Yêu cầu hệ thống

- Node.js 22 hoặc phiên bản tương thích với Vite 8
- npm
- Backend API đang chạy và cung cấp endpoint theo cấu hình `VITE_API_URL`

## Cài đặt

Clone repository và cài dependency:

```bash
git clone <repository-url>
cd bstore-frontend
npm install
```

Tạo file môi trường từ file mẫu:

```bash
cp .env.example .env
```

Hoặc trên PowerShell:

```powershell
Copy-Item .env.example .env
```

Cấu hình `.env`:

```env
VITE_API_URL=http://127.0.0.1:8000/api
VITE_API_TIMEOUT=15000
```

## Chạy dự án

Chạy môi trường phát triển:

```bash
npm run dev
```

Sau khi chạy, mở địa chỉ Vite hiển thị trên terminal, thường là:

```text
http://localhost:5173
```

## Script npm

```bash
npm run dev      # Chạy development server
npm run build    # Build production vào thư mục dist
npm run preview  # Xem thử bản production build
npm run lint     # Kiểm tra ESLint
```

## Build production

```bash
npm run build
```

Thư mục output:

```text
dist/
```

Có thể deploy thư mục `dist/` lên hosting tĩnh hoặc web server bất kỳ. Dự án đã có sẵn cấu hình Nginx để phục vụ React Router bằng `try_files`.

## Chạy bằng Docker

Build image:

```bash
docker build -t bstore-frontend .
```

Build với API URL riêng:

```bash
docker build --build-arg VITE_API_URL=http://your-api-domain/api --build-arg VITE_API_TIMEOUT=15000 -t bstore-frontend .
```

Chạy container:

```bash
docker run --rm -p 8080:80 bstore-frontend
```

Mở trình duyệt tại:

```text
http://localhost:8080
```

## Cấu trúc thư mục

```text
bstore-frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # Component dùng chung
│   ├── config/          # Cấu hình dùng trong ứng dụng
│   ├── context/         # Auth, cart, toast context
│   ├── layouts/         # Layout người dùng và admin
│   ├── pages/           # Các trang của ứng dụng
│   ├── services/        # Axios instance và API service
│   ├── utils/           # Hàm tiện ích
│   ├── App.jsx          # Khai báo router chính
│   └── main.jsx         # Entry point React
├── Dockerfile
├── nginx.conf
├── package.json
└── vite.config.js
```

## Route chính

- `/` - Trang chủ
- `/products` - Danh sách sản phẩm
- `/products/category/:categorySlug` - Sản phẩm theo danh mục
- `/products/brand/:brandSlug` - Sản phẩm theo thương hiệu
- `/sale` - Sản phẩm khuyến mãi
- `/new-products` - Sản phẩm mới
- `/products/:slug` - Chi tiết sản phẩm
- `/news` - Tin tức
- `/contact` - Liên hệ
- `/warranty-policy` - Chính sách bảo hành
- `/return-policy` - Chính sách đổi trả
- `/shipping-policy` - Chính sách vận chuyển
- `/payment-methods` - Phương thức thanh toán
- `/terms-of-use` - Điều khoản sử dụng
- `/login` - Đăng nhập
- `/register` - Đăng ký
- `/cart` - Giỏ hàng
- `/checkout` - Thanh toán
- `/admin` - Trang quản trị
- `/admin/brands` - Quản lý thương hiệu

## Ghi chú cấu hình API

Ứng dụng sử dụng Axios instance tại `src/services/api.js`.

- `VITE_API_URL` là base URL của backend API.
- `VITE_API_TIMEOUT` là thời gian timeout cho request, tính bằng millisecond.
- Token đăng nhập được gửi qua header `Authorization: Bearer <token>`.
- Khi API trả về `401`, ứng dụng tự xóa phiên đăng nhập hiện tại.

## Kiểm tra trước khi đưa lên GitHub

Nên chạy các lệnh sau trước khi commit:

```bash
npm run lint
npm run build
```
