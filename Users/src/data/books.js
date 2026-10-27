// Temporary reader catalog: titles and covers come from the 62 collected local cover files.
const publisherNames = {
  NXB01: 'Nhà xuất bản Trẻ',
  NXB02: 'Nhà xuất bản Văn học',
  NXB03: 'Nhà xuất bản Kim Đồng',
  NXB04: 'Nhà xuất bản Thế Giới',
  NXB05: 'Nhà xuất bản Lao Động',
  NXB06: 'Nhà xuất bản Tổng hợp TP.HCM',
}

const bookMetadata = {
  '1984.jpg': { author: 'George Orwell', genre: 'Văn học dystopia', maNXB: 'NXB02' },
  'an-mang-tren-chuyen-tau-toc-hanh-phuong-dong.jpg': { author: 'Agatha Christie', genre: 'Trinh thám', maNXB: 'NXB02' },
  'anne-toc-do-duoi-chai-nha-xanh.jpg': { author: 'Lucy Maud Montgomery', genre: 'Văn học thiếu nhi', maNXB: 'NXB03' },
  'ban-ve-tu-do.jpg': { author: 'John Stuart Mill', genre: 'Triết học', maNXB: 'NXB06' },
  'bat-dau-voi-cau-hoi-tai-sao.jpg': { author: 'Simon Sinek', genre: 'Kỹ năng và quản trị', maNXB: 'NXB05' },
  'bat-tre-dong-xanh.jpg': { author: 'J. D. Salinger', genre: 'Văn học nước ngoài', maNXB: 'NXB02' },
  'benh-nhan-im-lang.jpg': { author: 'Alex Michaelides', genre: 'Trinh thám', maNXB: 'NXB04' },
  'bong-hong-vang-binh-minh-mua.jpg': { author: 'Konstantin Paustovsky', genre: 'Văn học nước ngoài', maNXB: 'NXB02' },
  'cau-chuyen-nghe-thuat.jpg': { author: 'E. H. Gombrich', genre: 'Nghệ thuật', maNXB: 'NXB04' },
  'cay-cam-ngot-cua-toi.jpg': { author: 'José Mauro de Vasconcelos', genre: 'Văn học nước ngoài', maNXB: 'NXB01' },
  'cho-toi-xin-mot-ve-di-tuoi-tho.jpg': { author: 'Nguyễn Nhật Ánh', genre: 'Văn học Việt Nam', maNXB: 'NXB01' },
  'chua-te-nhung-chiec-nhan-doan-ho-nhan.jpg': { author: 'J. R. R. Tolkien', genre: 'Giả tưởng', maNXB: 'NXB04' },
  'chua-te-nhung-chiec-nhan-hai-toa-thap.jpg': { author: 'J. R. R. Tolkien', genre: 'Giả tưởng', maNXB: 'NXB04' },
  'chua-te-nhung-chiec-nhan-nha-vua-tro-ve.jpg': { author: 'J. R. R. Tolkien', genre: 'Giả tưởng', maNXB: 'NXB04' },
  'chu-nghia-khac-ky.jpg': { author: 'Ryan Holiday', genre: 'Triết học và lối sống', maNXB: 'NXB06' },
  'chuyen-con-meo-day-hai-au-bay.jpg': { author: 'Luis Sepúlveda', genre: 'Văn học thiếu nhi', maNXB: 'NXB03' },
  'clean-code.jpg': { author: 'Robert C. Martin', genre: 'Công nghệ', maNXB: 'NXB05' },
  'co-gai-co-hinh-xam-rong.jpg': { author: 'Stieg Larsson', genre: 'Trinh thám', maNXB: 'NXB02' },
  'co-gai-tren-tau.jpg': { author: 'Paula Hawkins', genre: 'Trinh thám', maNXB: 'NXB02' },
  'cuon-sach-cua-nhung-bi-mat.jpg': { author: 'Deepak Chopra', genre: 'Tâm lý và phát triển bản thân', maNXB: 'NXB06' },
  'cuon-theo-chieu-gio.jpg': { author: 'Margaret Mitchell', genre: 'Văn học nước ngoài', maNXB: 'NXB02' },
  'dac-nhan-tam.jpg': { author: 'Dale Carnegie', genre: 'Kỹ năng sống', maNXB: 'NXB06' },
  'di-tim-le-song.jpg': { author: 'Viktor E. Frankl', genre: 'Tâm lý và phát triển bản thân', maNXB: 'NXB06' },
  'fahrenheit-451.jpg': { author: 'Ray Bradbury', genre: 'Văn học dystopia', maNXB: 'NXB02' },
  'gen-lich-su-va-tuong-lai-cua-nhan-loai.jpg': { author: 'Siddhartha Mukherjee', genre: 'Khoa học', maNXB: 'NXB04' },
  'hai-so-phan.jpg': { author: 'Jeffrey Archer', genre: 'Văn học nước ngoài', maNXB: 'NXB02' },
  'hoang-tu-be.jpg': { author: 'Antoine de Saint-Exupéry', genre: 'Văn học thiếu nhi', maNXB: 'NXB03' },
  'Kafka-ben-bo-bien.jpg': { author: 'Haruki Murakami', genre: 'Văn học nước ngoài', maNXB: 'NXB04' },
  'khi-loi-thuoc-ve-nhung-vi-sao.jpg': { author: 'John Green', genre: 'Văn học nước ngoài', maNXB: 'NXB01' },
  'khong-gia-dinh.jpg': { author: 'Hector Malot', genre: 'Văn học thiếu nhi', maNXB: 'NXB03' },
  'kieu-hanh-va-dinh-kien.jpg': { author: 'Jane Austen', genre: 'Văn học nước ngoài', maNXB: 'NXB02' },
  'luoc-su-thoi-gian.jpg': { author: 'Stephen Hawking', genre: 'Khoa học', maNXB: 'NXB04' },
  'luoc-su-van-vat.jpg': { author: 'Bill Bryson', genre: 'Khoa học', maNXB: 'NXB04' },
  'mat-ma-davinci.jpg': { author: 'Dan Brown', genre: 'Trinh thám', maNXB: 'NXB02' },
  'mot-doi-nhu-ke-tim-duong.jpg': { author: 'Phan Việt', genre: 'Văn học Việt Nam', maNXB: 'NXB06' },
  'nghe-thuat-tinh-te-cua-viec-dech-quan-tam.jpg': { author: 'Mark Manson', genre: 'Tâm lý và phát triển bản thân', maNXB: 'NXB06' },
  'nghi-giau-va-lam-giau.jpg': { author: 'Napoleon Hill', genre: 'Kỹ năng sống', maNXB: 'NXB06' },
  'nguoi-dua-dieu.jpg': { author: 'Khaled Hosseini', genre: 'Văn học nước ngoài', maNXB: 'NXB02' },
  'nguoi-giau-co-nhat-thanh-babylon.jpg': { author: 'George S. Clason', genre: 'Tài chính cá nhân', maNXB: 'NXB06' },
  'nguoi-xa-la.jpg': { author: 'Albert Camus', genre: 'Văn học nước ngoài', maNXB: 'NXB02' },
  'nha-gia-kim.jpg': { author: 'Paulo Coelho', genre: 'Văn học nước ngoài', maNXB: 'NXB04' },
  'nhung-nguoi-khon-kho.jpg': { author: 'Victor Hugo', genre: 'Văn học nước ngoài', maNXB: 'NXB02' },
  'nhung-tam-long-cao-ca.jpg': { author: 'Edmondo De Amicis', genre: 'Văn học thiếu nhi', maNXB: 'NXB03' },
  'nhung-tu-nhan-cua-dia-ly.jpg': { author: 'Tim Marshall', genre: 'Địa lý và chính trị', maNXB: 'NXB04' },
  'phi-ly-tri.jpg': { author: 'Dan Ariely', genre: 'Tâm lý học', maNXB: 'NXB06' },
  'rung-nauy.jpg': { author: 'Haruki Murakami', genre: 'Văn học nước ngoài', maNXB: 'NXB04' },
  'sao-chung-ta-lai-ngu.jpg': { author: 'Matthew Walker', genre: 'Khoa học', maNXB: 'NXB04' },
  'sapiens-luoc-su-loai-nguoi.jpg': { author: 'Yuval Noah Harari', genre: 'Lịch sử', maNXB: 'NXB04' },
  'sherlock-holmes-1.jpg': { author: 'Arthur Conan Doyle', genre: 'Trinh thám', maNXB: 'NXB02' },
  'sherlock-holmes-2.jpg': { author: 'Arthur Conan Doyle', genre: 'Trinh thám', maNXB: 'NXB02' },
  'sherlock-holmes-3.jpg': { author: 'Arthur Conan Doyle', genre: 'Trinh thám', maNXB: 'NXB02' },
  'steal-like-an-artist.jpg': { author: 'Austin Kleon', genre: 'Sáng tạo và nghệ thuật', maNXB: 'NXB06' },
  'su-im-lang-cua-bay-cuu.jpg': { author: 'Thomas Harris', genre: 'Trinh thám', maNXB: 'NXB02' },
  'suoi-nguon.jpg': { author: 'Ayn Rand', genre: 'Văn học nước ngoài', maNXB: 'NXB02' },
  'tam-ly-hoc-ve-tien.jpg': { author: 'Morgan Housel', genre: 'Tài chính cá nhân', maNXB: 'NXB06' },
  'the-design-of-everyday-things.jpg': { author: 'Don Norman', genre: 'Thiết kế', maNXB: 'NXB05' },
  'the-god-father.jpg': { author: 'Mario Puzo', genre: 'Văn học nước ngoài', maNXB: 'NXB02' },
  'thu-vien-nua-dem.jpg': { author: 'Matt Haig', genre: 'Văn học nước ngoài', maNXB: 'NXB04' },
  'tram-nam-co-don.jpg': { author: 'Gabriel García Márquez', genre: 'Văn học nước ngoài', maNXB: 'NXB02' },
  'tu-duy-nhanh-va-cham.jpg': { author: 'Daniel Kahneman', genre: 'Tâm lý học', maNXB: 'NXB06' },
  'tuoi-tre-dang-gia-bao-nhieu.jpg': { author: 'Rosie Nguyễn', genre: 'Kỹ năng sống', maNXB: 'NXB01' },
  'va-roi-chang-con-ai.jpg': { author: 'Agatha Christie', genre: 'Trinh thám', maNXB: 'NXB02' },
}

const coverModules = import.meta.glob('@/assets/images/Books/**/*.jpg', {
  eager: true,
  import: 'default',
  query: '?url',
})

function getCoverFile(path) {
  return path.split('/').at(-1)
}

function getTitleFromCover(fileName) {
  const words = fileName.replace(/\.jpg$/i, '').replace(/[-_]+/g, ' ')
  return words.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('vi'))
}

const books = Object.entries(coverModules)
  .sort(([pathA], [pathB]) => pathA.localeCompare(pathB, 'vi'))
  .map(([path, cover]) => {
    const coverFile = getCoverFile(path)
    const metadata = bookMetadata[coverFile] || {}

    return {
      id: coverFile,
      coverFile,
      cover,
      title: metadata.title || getTitleFromCover(coverFile),
      author: metadata.author || '',
      genre: metadata.genre || '',
      maNXB: metadata.maNXB || '',
      tenNXB: publisherNames[metadata.maNXB] || '',
      status: 'Chưa cập nhật',
    }
  })

export default books
