import { reactive } from 'vue'

// The interface starts empty until real data is provided by a data source.
export const entityStore = reactive({
  books: [],
  readers: [],
  employees: [],
  accounts: [],
  publishers: [],
  borrows: [],
  staffProfile: {},
})
