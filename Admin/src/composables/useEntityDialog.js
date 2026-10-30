import { reactive, unref, watch } from 'vue'

export default function useEntityDialog({ open, mode, record, publishers, busy, onSave }) {
  const values = reactive({})

  watch(() => [unref(open), unref(mode), unref(record)], () => {
    for (const key of Object.keys(values)) delete values[key]
    Object.assign(values, unref(record) || {})
  }, { immediate: true, deep: true })

  function optionsFor(field) {
    if (field.optionsFrom === 'publishers') {
      return (unref(publishers) || []).map((publisher) => ({ label: publisher[field.optionLabel], value: publisher[field.optionValue] }))
    }
    return (field.options || []).map((option) => typeof option === 'object' ? option : { label: option, value: option })
  }

  function fieldValue(field) {
    const value = unref(record)?.[field.key]
    if (field.type === 'date' && value) return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN')
    if (field.type === 'select' && field.optionsFrom === 'publishers') {
      return optionsFor(field).find((item) => item.value === value)?.label || value || '—'
    }
    if (field.type === 'select' && Array.isArray(field.options)) {
      const option = optionsFor(field).find((item) => item.value === value)
      if (option) return option.label
    }
    if (field.type === 'status') return value
    return value === true ? 'Đang hoạt động' : value === false ? 'Đã khóa' : value || '—'
  }

  function submit() {
    if (!unref(busy)) onSave({ ...values })
  }

  return { values, optionsFor, fieldValue, submit }
}
