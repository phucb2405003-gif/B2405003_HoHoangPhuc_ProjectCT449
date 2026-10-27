// Chỉnh metadata theo tên file bìa tại đây; chưa có backend data thì các giá trị mặc định là minh họa.
const bookMetadata = {
  // Ví dụ: '1984.jpg': { title: '1984', author: '...', genre: '...' },
}

const sampleGenres = ['Văn học (minh họa)', 'Kỹ năng (minh họa)', 'Tâm lý (minh họa)', 'Lịch sử (minh họa)', 'Thiếu nhi (minh họa)', 'Khoa học (minh họa)']
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
  return words.charAt(0).toLocaleUpperCase('vi') + words.slice(1)
}

const books = Object.entries(coverModules)
  .sort(([pathA], [pathB]) => pathA.localeCompare(pathB, 'vi'))
  .map(([path, cover], index) => {
    const coverFile = getCoverFile(path)
    const metadata = bookMetadata[coverFile] || {}

    return {
      id: coverFile,
      coverFile,
      cover,
      title: metadata.title || getTitleFromCover(coverFile),
      author: metadata.author || `Tác giả minh họa ${String((index % 12) + 1).padStart(2, '0')}`,
      genre: metadata.genre || sampleGenres[index % sampleGenres.length],
      status: metadata.status || 'Thông tin minh họa',
    }
  })

export default books
