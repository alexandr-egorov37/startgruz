-- Добавляем уникальность для user_id в документах верификации
-- Это позволит использовать UPSERT и гарантирует, что у одного исполнителя только один активный запрос

-- Сначала удалим дубликаты, если они есть (оставим самый новый)
DELETE FROM public.verification_documents a
USING public.verification_documents b
WHERE a.id < b.id 
  AND a.user_id = b.user_id;

-- Добавляем уникальное ограничение
ALTER TABLE public.verification_documents 
ADD CONSTRAINT verification_documents_user_id_key UNIQUE (user_id);
