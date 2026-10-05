export { createAdminClient, createBrowserClient } from './client';
// Json 은 create_post 같은 DB 함수의 인자 타입에 나타난다. 내보내지 않으면
// 클라이언트를 만드는 쪽에서 추론된 타입에 이름을 붙이지 못한다.
export type { Database, Json } from './database.types';
export type { SupabaseClient } from '@supabase/supabase-js';
