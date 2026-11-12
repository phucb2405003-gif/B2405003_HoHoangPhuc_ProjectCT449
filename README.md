# Hệ thống quản lý thư viện (QLMS)

QLMS là ứng dụng quản lý thư viện gồm trang dành cho độc giả, trang nghiệp vụ dành cho nhân viên và API dùng chung. Dữ liệu được lưu trong MongoDB; hai giao diện được xây dựng bằng Vue 3 và Vite, Backend dùng Node.js và Express.

## Thành phần

| Thư mục | Vai trò | Mặc định |
| --- | --- | --- |
| `Backend/` | REST API, xác thực, nghiệp vụ sách và mượn trả | `http://localhost:3000` |
| `Users/` | Tra cứu sách, xem chi tiết, đăng nhập và quản lý phiếu mượn cá nhân | `http://localhost:3002` |
| `Admin/` | Giao diện nhân viên quản lý thư viện | `http://localhost:3001` |

## Yêu cầu

- Node.js phù hợp với Vite: Node `^22.18.0` hoặc `>=24.12.0`.
- npm.
- MongoDB đang chạy và có thể truy cập từ Backend.

## Cài đặt và chạy

Mở ba cửa sổ terminal tại thư mục dự án. Cài dependency riêng cho từng ứng dụng:

```sh
cd Backend
npm install
```

```sh
cd Users
npm install
```

```sh
cd Admin
npm install
```

Tạo file `Backend/.env` với cấu hình MongoDB và khóa ký token:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017
DB_NAME=qlms
JWT_SECRET=thay-bang-chuoi-bi-mat-dai-va-ngau-nhien
PORT=3000
# Không bắt buộc nếu dùng hai địa chỉ mặc định localhost:3001 và localhost:3002
# CORS_ORIGINS=http://localhost:3001,http://localhost:3002
```

`MONGODB_URI`, `DB_NAME` và `JWT_SECRET` là bắt buộc. `PORT` mặc định là `3000`. Khi triển khai, đặt `CORS_ORIGINS` thành danh sách origin của các giao diện, phân tách bằng dấu phẩy; mỗi origin chỉ gồm scheme và host (có thể kèm port), không thêm đường dẫn.

Chạy từng phần trong terminal tương ứng:

```sh
cd Backend
npm start
```

```sh
cd Users
npm run dev
```

```sh
cd Admin
npm run dev
```

Mở trang độc giả tại `http://localhost:3002` và trang quản trị tại `http://localhost:3001`. Hai frontend mặc định gọi API tại `http://localhost:3000`. Nếu API chạy ở địa chỉ khác, đặt `VITE_API_BASE_URL` trong file `.env` của `Users/` và `Admin/`, ví dụ `VITE_API_BASE_URL=http://localhost:4000`, rồi khởi động lại Vite.

## Cách sử dụng

### Độc giả

1. Vào trang chủ hoặc mục sách để tìm và xem thông tin sách.
2. Đăng nhập bằng tài khoản độc giả để mở trang cá nhân.
3. Tạo phiếu mượn, chọn sách và gửi phiếu để nhân viên xử lý.
4. Theo dõi trạng thái phiếu và thông tin từng sách trong trang cá nhân. Độc giả chỉ xem và thao tác trên phiếu của mình; các thao tác bị giới hạn theo trạng thái phiếu.

### Nhân viên thư viện

1. Đăng nhập tại trang Admin bằng tài khoản nhân viên.
2. Xem tổng quan, rồi dùng các mục được cấp quyền để quản lý sách, độc giả, phiếu mượn và nhà xuất bản.
3. Nhân viên có thể xử lý phiếu (duyệt hoặc từ chối), ghi nhận trả sách và cập nhật thông tin theo quyền tài khoản.
4. Quản lý có thêm quyền quản lý nhân viên và tài khoản. Thủ thư không được cấp các mục quản trị nhân sự/tài khoản.

Quyền truy cập được Backend kiểm tra; việc ẩn mục trên giao diện không thay thế cho xác thực phía máy chủ. Cần có tài khoản hợp lệ trong hệ thống trước khi đăng nhập. Repo không định nghĩa sẵn tài khoản mẫu hay quy trình nạp dữ liệu mẫu.

## API

Các endpoint API nằm dưới `/api`:

| Nhóm | Đường dẫn | Mô tả |
| --- | --- | --- |
| Xác thực | `/api/auth` | Đăng nhập và thông tin phiên hiện tại |
| Sách | `/api/books` | Tra cứu và quản lý sách, tồn kho |
| Độc giả | `/api/users` | Hồ sơ và quản lý độc giả |
| Nhà xuất bản | `/api/publishers` | Danh mục nhà xuất bản |
| Phiếu mượn | `/api/borrows` | Tạo, xem, xử lý phiếu và ghi nhận trả sách |
| Chi tiết phiếu | `/api/borrow-details` | Tra cứu chi tiết phiếu (theo quyền) |
| Nhân viên | `/api/employees` | Quản lý nhân viên |
| Tài khoản | `/api/accounts` | Quản lý tài khoản và thông tin đăng nhập |

Các route đọc công khai và route yêu cầu bearer token khác nhau; quyền cụ thể tùy endpoint và vai trò. Dùng mã nguồn trong `Backend/src/routes/` làm hợp đồng chi tiết cho request, response và phân quyền.

## Build frontend

Chạy trong `Users/` hoặc `Admin/`:

```sh
npm run build
```

Chạy bản build bằng Vite preview:

```sh
npm run preview
```

## Cấu trúc mã nguồn

```text
Backend/src/
  config/       Kết nối MongoDB, index và CORS
  controllers/  Xử lý request/response
  middlewares/  Xác thực và phân quyền
  routes/       Khai báo endpoint API
  services/     Nghiệp vụ và truy cập dữ liệu
Users/src/      Giao diện độc giả, router và API client
Admin/src/      Giao diện nhân viên, router, quyền và API client
```

## Lưu ý cấu hình

- Không đưa `Backend/.env` hoặc khóa bí mật lên Git.
- Backend khởi động sau khi kết nối MongoDB, kiểm tra cấu hình và tạo các index cần thiết.
- Backend tự xử lý các phiếu nháp hết hạn theo chu kỳ trong lúc chạy.
- Nếu không đăng nhập được, kiểm tra tài khoản, kết nối MongoDB, `JWT_SECRET` và log của Backend.
- Nếu frontend không gọi được API trên trình duyệt, kiểm tra Backend đang chạy, `VITE_API_BASE_URL` và origin trong `CORS_ORIGINS`.
