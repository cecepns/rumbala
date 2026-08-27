export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    PROFILE: "/auth/profile",
  },
  USERS: {
    LIST: "/users",
    DETAIL: (id) => `/users/${id}`,
    CREATE: "/users",
    UPDATE: (id) => `/users/${id}`,
    DELETE: (id) => `/users/${id}`,
    RESET_PASSWORD: (id) => `/users/${id}/reset-password`,
  },
  SETTINGS: {
    LIST: "/settings",
    UPDATE: "/settings",
  },
  PARENT: {
    CHILDREN: "/parent/children",
    SUMMARY: "/parent/summary",
  },
  TUTOR_STUDENTS: {
    LIST: "/tutor/students",
    DASHBOARD_SUMMARY: "/tutor/dashboard-summary",
    UPDATE_LEARNING_PROFILE: (id) => `/tutor/students/${id}/learning-profile`,
  },
  STUDENTS: {
    LIST: "/students",
    DETAIL: (id) => `/students/${id}`,
    CREATE: "/students",
    UPDATE: (id) => `/students/${id}`,
    DELETE: (id) => `/students/${id}`,
  },
  STUDENT_PROGRAMS: {
    LIST: "/student-programs",
    CREATE: "/student-programs",
    UPDATE: (id) => `/student-programs/${id}`,
    DELETE: (id) => `/student-programs/${id}`,
  },
  UNITS: {
    LIST: "/units",
    CREATE: "/units",
    UPDATE: (id) => `/units/${id}`,
    DELETE: (id) => `/units/${id}`,
  },
  PROGRAMS: {
    LIST: "/programs",
    CREATE: "/programs",
    UPDATE: (id) => `/programs/${id}`,
    DELETE: (id) => `/programs/${id}`,
  },
  TUTORS: {
    LIST: "/tutors",
    DETAIL: (id) => `/tutors/${id}`,
    CREATE: "/tutors",
    UPDATE: (id) => `/tutors/${id}`,
    DELETE: (id) => `/tutors/${id}`,
    RATES: (id) => `/tutors/${id}/rates`,
    ADD_RATE: (id) => `/tutors/${id}/rates`,
    DELETE_RATE: (id, rateId) => `/tutors/${id}/rates/${rateId}`,
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
    UPDATE: (id) => `/attendances/${id}`,
    CONFIRM: (id) => `/attendances/${id}/confirm`,
  },
  RESCHEDULE: {
    LIST: "/reschedule",
    CREATE: "/reschedule",
    UPDATE_STATUS: (id) => `/reschedule/${id}/status`,
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
    UPDATE: (id) => `/ai-reports/${id}`,
    DELETE: (id) => `/ai-reports/${id}`,
  },
  PROGRESS: {
    DETAIL: (studentId) => `/progress/${studentId}`,
  },
  INVOICES: {
    LIST: "/invoices",
    DETAIL: (id) => `/invoices/${id}`,
    GENERATE_MONTHLY: "/invoices/generate-monthly",
    PAY: (id) => `/invoices/${id}/pay`,
    DELETE: (id) => `/invoices/${id}`,
  },
  FINANCES: {
    SUMMARY: "/finances/summary",
  },
  TUTOR_ATTENDANCE: {
    RECAP: "/tutor-attendance-recap",
  },
  TUTOR_RECAPS: {
    LIST: "/tutor-recaps",
    GENERATE: "/tutor-recaps/generate",
    PAY: (id) => `/tutor-recaps/${id}/pay`,
    EXPORT: "/tutor-recaps/export-spreadsheet",
  },
  DASHBOARD: {
    STATS: "/dashboard/stats",
  },
  UPLOAD: "/upload",
};
