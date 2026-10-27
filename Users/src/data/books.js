// Temporary reader catalog: titles and covers come from the 62 collected local cover files.
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

    return {
      id: coverFile,
      coverFile,
      cover,
      title: getTitleFromCover(coverFile),
      author: '',
      genre: '',
      status: 'Chưa cập nhật',
    }
  })

export default books
