export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    PROFILE: "/auth/profile",
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
  },
  PROGRAMS: {
    LIST: "/programs",
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
    GENERATE_MONTHLY: "/invoices/generate-monthly",
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
