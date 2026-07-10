export const API_URLS = Object.freeze({
  COURSE_LIST: "/block/lms_courses-catalog_courses_v1",
  COURSE_LIST_V2: "/block/mk_courses",
  COURSE: "/block/lms_course_view_v1",
  FILTERS: "/block/lms_courses-catalog_filters_v1",
  TEST_MODEL: "/block/block_test_v2",
  TEST_QUESTION_MODEL: "/block/view_question_block",
  TEST_QUESTION_UPDATE: "/block/ab_save_answer_v2",
  TEST_FINISH: "/block/action_block_finishtest",
  TEST_REPORT: "/block/test_exec_protocol",
  TEST_LAST_SESSION: "/block/last_session_for_test",
  TEST_SESSION_RESET: "/block/ab_abandon_attempt",
  ANALYTICS: "/block/analytic_set_v2",
  SAVE_UNIT_RESULTS: "/block/ab_save_results_unit_v2",
  GET_SCORM_PROGRESS: "/block/get_scorm_progress",
  SET_SCORM_PROGRESS: "/block/set_scorm_progress",
  MEDIA_LIST: "/block/media_list",
  MEDIA_BY_ID: "/block/media_by_id",
  MEDIA_LIKE: "/block/media_like_v2",
  MEDIA_MARK_VIEWED: "/block/media_mark_viewed",
  ANALYTICS_METRICS: "/block/analytics_tracker",
  CODES_GENERATE: "/block/codes_generate_v1",
  CODES_VALIDATE: "/block/codes_validate_v1",
  ACKNOWLEDGEMENT_NEED: "/block/acknowledgement_need_v1",
  UPLOAD_FILE: "/tools/file/load",
});

export const MAX_RETRIES = 3;

export const MEDIA_DETAILS_KEY = "id";

export const MEDIA_API_KEYS = {
  Page: "page",
  Limit: "limit",
  MediaType: "media_type",
  Sort: "sort",
};

export const PAGE_SIZE = 50;
