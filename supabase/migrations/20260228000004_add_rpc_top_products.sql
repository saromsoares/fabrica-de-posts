CREATE OR REPLACE FUNCTION public.get_top_products_by_generations(p_factory_id uuid)
RETURNS TABLE (product_id uuid, product_name text, image_url text, generation_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.id, p.name, p.image_url, COUNT(g.id)
  FROM public.products p
  LEFT JOIN public.generations g ON g.product_id = p.id
  WHERE p.factory_id = p_factory_id
  GROUP BY p.id, p.name, p.image_url
  ORDER BY COUNT(g.id) DESC LIMIT 5;
$$;
