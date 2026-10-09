-- Validation IDs are generated from the existing procedural catalog.
create or replace function app_private.valid_furniture_configuration(c jsonb, nesting integer default 0)
returns boolean language plpgsql immutable set search_path='' as $$
declare field text; value jsonb; item jsonb; bounds jsonb; n numeric;
begin
 if c is null or jsonb_typeof(c) <> 'object' or octet_length(c::text)>250000 or nesting>1 then return false; end if;
 if jsonb_typeof(c->'type') is distinct from 'string' or not ((c->>'type')=any(array['guarda-roupa-2','guarda-roupa-3','guarda-roupa','guarda-roupa-correr','cozinha','cozinha-superior','torre-quente','balcao','ilha','rack','painel-tv','estante','aparador','mesa','home-office','gaveteiro','criado-mudo','comoda','cabeceira','banheiro','guarda-roupa-1','guarda-roupa-canto','guarda-roupa-l','closet-modular','roupeiro-aberto','maleiro','gabinete-pia-cozinha','canto-inferior','canto-superior','paneleiro','cristaleira-cozinha','microondas','forno','geladeira','adega-cozinha','prateleira-cozinha','bancada-cozinha','mesa-integrada','torre-eletro','estante-suspensa','armario-suspenso-sala','cristaleira-sala','bar-sala','adega-sala','buffet','nichos-decorativos','prateleiras-sala','home-theater','banco-sala','painel-ripado-sala','rack-suspenso','mesa-reta','mesa-l','mesa-suspensa','escrivaninha','bancada-dupla','aereo-escritorio','armario-alto-escritorio','estante-escritorio','prateleira-escritorio','gaveteiro-movel','gaveteiro-fixo','nichos-escritorio','arquivo-escritorio','escrivaninha-quarto','penteadeira','sapateira-quarto','banco-quarto','bau-quarto','painel-tv-quarto','prateleira-quarto','nicho-quarto','aereo-quarto','cabeceira-criados','cabeceira-led','camarim','penteadeira-espelho','gabinete-pia-banheiro','gabinete-suspenso','armario-espelho','espelheira','torre-banheiro','nicho-banheiro','prateleira-banheiro','sobre-vaso','bancada-banheiro','gabinete-duplo','inferior-lavanderia','superior-lavanderia','torre-produtos','vassouras','gabinete-tanque','bancada-lavanderia','nicho-lavadora','sobre-lavadora','prateleira-lavanderia','sapateira-hall','aparador-hall','banco-hall','cabideiro-hall','armario-hall','painel-ripado-hall','nichos-hall','banco-baú-hall'])) then return false; end if;
 foreach field in array array['width','height','depth'] loop
  if jsonb_typeof(c->field) is distinct from 'number' then return false; end if;
  if (c->>field)::numeric not between 1 and 1000 then return false; end if;
 end loop;
 for field, bounds in select e.k,e.v from jsonb_each('{"columns":[1,12],"doors":[0,16],"drawers":[0,40],"shelves":[0,60],"niches":[0,6],"panelThickness":[0.8,5],"drawerHeight":[0,100]}'::jsonb) e(k,v) loop
  if c ? field then
   if jsonb_typeof(c->field) is distinct from 'number' then return false; end if;
   n:=(c->>field)::numeric;
   if n < (bounds->>0)::numeric or n > (bounds->>1)::numeric then return false; end if;
   if field in ('columns','doors','drawers','shelves','niches') and n<>trunc(n) then return false; end if;
  end if;
 end loop;
 if c ? 'material' and (jsonb_typeof(c->'material') is distinct from 'string' or not ((c->>'material')=any(array['branco','offwhite','bege','fendi','cinza','preto','carvalho','carvalho-claro','freijo','nogueira','amadeirado','madeira-escura','espelho','vidro','vidro-fume','fosco','acetinado']))) then return false; end if;
 if c ? 'materials' then
  if jsonb_typeof(c->'materials') is distinct from 'object' then return false; end if;
  for value in select v from jsonb_each(c->'materials') e(k,v) loop
   if jsonb_typeof(value) is distinct from 'string' or not ((value#>>'{}')=any(array['branco','offwhite','bege','fendi','cinza','preto','carvalho','carvalho-claro','freijo','nogueira','amadeirado','madeira-escura','espelho','vidro','vidro-fume','fosco','acetinado'])) then return false; end if;
  end loop;
 end if;
 foreach field in array array['componentOffsets','accessoryOffsets'] loop
  if c ? field then
   if jsonb_typeof(c->field) is distinct from 'object' then return false; end if;
   if (select count(*) from jsonb_object_keys(c->field))>200 then return false; end if;
   for value in select v from jsonb_each(c->field) e(k,v) loop
    if jsonb_typeof(value) is distinct from 'array' then return false; end if;
    if jsonb_array_length(value)<>3 then return false; end if;
    for item in select v from jsonb_array_elements(value) e(v) loop
     if jsonb_typeof(item) is distinct from 'number' then return false; end if;
     if (item#>>'{}')::numeric not between -1000 and 1000 then return false; end if;
    end loop;
   end loop;
  end if;
 end loop;
 if c ? 'componentInstances' then
  if jsonb_typeof(c->'componentInstances') is distinct from 'array' then return false; end if;
  if jsonb_array_length(c->'componentInstances')>60 then return false; end if;
  for item in select v from jsonb_array_elements(c->'componentInstances') e(v) loop
   if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'id') is distinct from 'string' or item->>'id' !~ '^mod-[A-Za-z0-9-]{1,76}$' or jsonb_typeof(item->'type') is distinct from 'string' or not ((item->>'type')=any(array['prateleira','divisoria','divisoria-horizontal','nicho','maleiro','gaveta','gaveta-dupla','gaveta-profunda','cesto','sapateira','calceiro','cabideiro','cabideiro-retratil','porta','porta-dupla','porta-correr','porta-basculante','porta-vidro','espelho','puxador','perfil','painel-ripado','fita-led','led-interno','led-inferior','spot'])) then return false; end if;
   if jsonb_typeof(item->'position') is distinct from 'array' then return false; end if;
   if jsonb_array_length(item->'position')<>3 then return false; end if;
   for value in select v from jsonb_array_elements(item->'position') e(v) loop
    if jsonb_typeof(value) is distinct from 'number' then return false; end if;
    if (value#>>'{}')::numeric not between -1000 and 1000 then return false; end if;
   end loop;
  end loop;
 end if;
 if c ? 'roomItems' then
  if jsonb_typeof(c->'roomItems') is distinct from 'array' then return false; end if;
  if jsonb_array_length(c->'roomItems')>8 or (nesting>0 and jsonb_array_length(c->'roomItems')>0) then return false; end if;
  for item in select v from jsonb_array_elements(c->'roomItems') e(v) loop
   if jsonb_typeof(item) is distinct from 'object' or not app_private.valid_furniture_configuration(item->'config',nesting+1) then return false; end if;
  end loop;
 end if;
 return true;
exception when others then return false;
end $$;
revoke all on function app_private.valid_furniture_configuration(jsonb,integer) from public;

create or replace function app_private.guard_project_integrity() returns trigger language plpgsql security definer set search_path='' as $$
declare field text;
begin
 if tg_op='UPDATE' and (new.organization_id is distinct from old.organization_id or new.user_id is distinct from old.user_id) then
  raise exception 'O vínculo do projeto com a marcenaria e o autor não pode ser alterado';
 end if;
 if tg_op='INSERT' or new.config is distinct from old.config then
  if not app_private.valid_furniture_configuration(new.config) then raise exception 'Configuração inválida'; end if;
 end if;
 if new.customer is not null and (tg_op='INSERT' or new.customer is distinct from old.customer) then
  if jsonb_typeof(new.customer)<>'object' or octet_length(new.customer::text)>10000 then raise exception 'Dados do cliente inválidos'; end if;
  foreach field in array array['name','phone','email','city','notes'] loop
   if new.customer ? field and jsonb_typeof(new.customer->field) is distinct from 'string' then raise exception 'Dados do cliente inválidos'; end if;
  end loop;
 end if;
 return new;
end $$;
revoke all on function app_private.guard_project_integrity() from public;
create trigger guard_project_integrity before insert or update on public.projects for each row execute function app_private.guard_project_integrity();

create or replace function app_private.guard_lead_integrity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.organization_id is distinct from old.organization_id then raise exception 'O vínculo do lead com a marcenaria não pode ser alterado'; end if;
 if new.project_id is not null and not exists(select 1 from public.projects where id=new.project_id and organization_id=new.organization_id) then raise exception 'Projeto e lead devem pertencer à mesma marcenaria'; end if;
 return new;
end $$;
revoke all on function app_private.guard_lead_integrity() from public;
create trigger guard_lead_integrity before insert or update on public.leads for each row execute function app_private.guard_lead_integrity();

create index if not exists leads_project_id_idx on public.leads(project_id);
create index if not exists subscriptions_plan_id_idx on public.subscriptions(plan_id);
create index if not exists leads_org_phone_created_idx on public.leads(organization_id,phone,created_at desc);

-- SELECT has one policy per table; writes retain OWNER/ADMIN authorization.
drop policy catalog_write on public.catalog_items;
create policy catalog_insert on public.catalog_items for insert to authenticated with check(app_private.member_role(organization_id) in ('OWNER','ADMIN'));
create policy catalog_update on public.catalog_items for update to authenticated using(app_private.member_role(organization_id) in ('OWNER','ADMIN')) with check(app_private.member_role(organization_id) in ('OWNER','ADMIN'));
create policy catalog_delete on public.catalog_items for delete to authenticated using(app_private.member_role(organization_id) in ('OWNER','ADMIN'));
drop policy settings_write on public.organization_settings;
create policy settings_insert on public.organization_settings for insert to authenticated with check(app_private.member_role(organization_id) in ('OWNER','ADMIN'));
create policy settings_update on public.organization_settings for update to authenticated using(app_private.member_role(organization_id) in ('OWNER','ADMIN')) with check(app_private.member_role(organization_id) in ('OWNER','ADMIN'));
create policy settings_delete on public.organization_settings for delete to authenticated using(app_private.member_role(organization_id) in ('OWNER','ADMIN'));

-- Browser calls the Edge Function; only that server can submit a calculated price.
create or replace function public.submit_tenant_quote(tenant_slug text, configuration jsonb, estimated_price numeric, customer_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare org uuid; pid uuid:=gen_random_uuid(); pcode text; cname text; cphone text;
begin
 select id into org from public.organizations where slug=tenant_slug and published=true;
 if org is null then raise exception 'Marcenaria indisponível'; end if;
 if customer_data is null or jsonb_typeof(customer_data)<>'object' or octet_length(customer_data::text)>10000 then raise exception 'Dados do cliente inválidos'; end if;
 cname:=trim(customer_data->>'name'); cphone:=regexp_replace(customer_data->>'phone','[^0-9]','','g');
 if cname is null or length(cname) not between 2 and 120 or cphone is null or length(cphone) not between 10 and 15 then raise exception 'Informe nome e telefone com DDD válidos'; end if;
 if length(cphone) in (10,11) then cphone:='55'||cphone; end if;
 if not app_private.valid_furniture_configuration(configuration) then raise exception 'Configuração inválida'; end if;
 if estimated_price is null or estimated_price not between 0 and 100000000 then raise exception 'Estimativa inválida'; end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text,0));
 if (select count(*) from public.projects where organization_id=org and status='Orçamento' and created_at>now()-interval '1 minute')>=30 then raise exception 'Muitas solicitações. Aguarde um minuto e tente novamente'; end if;
 if (select count(*) from public.leads where organization_id=org and phone=cphone and created_at>now()-interval '10 minutes')>=5 then raise exception 'Você já enviou várias propostas. Aguarde alguns minutos'; end if;
 pcode:=customer_data->>'proposal_code';
 if pcode is null or pcode !~ '^M3D-[0-9]{4}-[A-F0-9]{12}$' then pcode:='M3D-'||to_char(now(),'YYYY')||'-'||upper(substr(replace(pid::text,'-',''),1,12)); end if;
 if exists(select 1 from public.projects where organization_id=org and code=pcode) then raise exception 'Esta proposta já foi enviada. Confira seus projetos'; end if;
 insert into public.projects(id,organization_id,user_id,code,config,price,customer,status) values(pid,org,null,pcode,configuration,estimated_price,(customer_data-'proposal_code')||jsonb_build_object('phone',cphone),'Orçamento');
 insert into public.leads(organization_id,project_id,name,phone,email) values(org,pid,cname,cphone,left(customer_data->>'email',254));
 return jsonb_build_object('id',pid,'code',pcode,'price',estimated_price);
end $$;
revoke all on function public.submit_tenant_quote(text,jsonb,numeric,jsonb) from public,anon,authenticated;
grant execute on function public.submit_tenant_quote(text,jsonb,numeric,jsonb) to service_role;
