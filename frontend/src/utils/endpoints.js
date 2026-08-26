export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    PROFILE: "/auth/profile",
  },
  STUDENTS: {
    LIST: "/students",
    DETAIL: (id) => `/students/${id}`,
    CREATE: "/students",
    UPDATE: (id) => `/students/${id}`,
    DELETE: (id) => `/students/${id}`,
  },
  TUTORS: {
    LIST: "/tutors",
    DETAIL: (id) => `/tutors/${id}`,
    CREATE: "/tutors",
    UPDATE: (id) => `/tutors/${id}`,
    DELETE: (id) => `/tutors/${id}`,
  },
  SCHEDULES: {
    LIST: "/schedules",
    DETAIL: (id) => `/schedules/${id}`,
    CREATE: "/schedules",
    UPDATE: (id) => `/schedules/${id}`,
    DELETE: (id) => `/schedules/${id}`,
  },
  ATTENDANCES: {
    LIST: "/attendances",
    CREATE: "/attendances",
    CONFIRM: (id) => `/attendances/${id}/confirm`,
  },
  JOURNALS: {
    LIST: "/journals",
    CREATE: "/journals",
    UPDATE: (id) => `/journals/${id}`,
    DELETE: (id) => `/journals/${id}`,
  },
  AI_REPORTS: {
    LIST: "/ai-reports",
    GENERATE: "/ai-reports/generate",
  },
  PROGRESS: {
    DETAIL: (studentId) => `/progress/${studentId}`,
  },
  WORKSHEETS: {
    LIST: "/worksheets",
    CREATE: "/worksheets",
    DELETE: (id) => `/worksheets/${id}`,
  },
  INVOICES: {
    LIST: "/invoices",
    DETAIL: (id) => `/invoices/${id}`,
    GENERATE_MANUAL: "/invoices/generate-manual",
    PAY: (id) => `/invoices/${id}/pay`,
  },
  FINANCES: {
    SUMMARY: "/finances/summary",
  },
  TUTOR_RECAPS: {
    LIST: "/tutor-recaps",
  },
  DASHBOARD: {
    STATS: "/dashboard/stats",
  },
  UPLOAD: "/upload",
};
