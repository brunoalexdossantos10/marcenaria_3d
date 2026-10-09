create or replace function public.create_organization(company_name text, company_slug text, profile_name text default '') returns uuid
 language plpgsql security definer set search_path='' as $$
 declare org uuid; begin
 if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if exists(select 1 from public.organization_members where user_id=auth.uid() and role='OWNER') then raise exception 'Sua conta já possui uma marcenaria'; end if;
 insert into public.organizations(name,slug) values(trim(company_name),lower(trim(company_slug))) returning id into org;
 insert into public.organization_members values(org,auth.uid(),'OWNER',now());
 insert into public.profiles(id,name) values(auth.uid(),left(profile_name,120)) on conflict(id) do nothing;
 insert into public.subscriptions(organization_id) values(org);
 insert into public.organization_settings(organization_id) values(org);
 return org; end $$;

create or replace function public.submit_tenant_quote(tenant_slug text, configuration jsonb, estimated_price numeric, customer_data jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
 declare org uuid; pid uuid:=gen_random_uuid(); pcode text; cname text; cphone text; begin
 select id into org from public.organizations where slug=tenant_slug and published=true;
 if org is null then raise exception 'Marcenaria indisponível'; end if;
 if customer_data is null or jsonb_typeof(customer_data) <> 'object' then raise exception 'Dados do cliente inválidos'; end if;
 cname:=trim(customer_data->>'name'); cphone:=trim(customer_data->>'phone');
 if cname is null or length(cname) not between 2 and 120 or cphone is null or length(cphone) not between 8 and 30 then raise exception 'Informe nome e telefone válidos'; end if;
 if configuration is null or jsonb_typeof(configuration) <> 'object' or not (configuration ?& array['type','width','height','depth']) or octet_length(configuration::text)>250000 or configuration->>'type' is null or (configuration->>'width')::numeric not between 1 and 1000 or (configuration->>'height')::numeric not between 1 and 1000 or (configuration->>'depth')::numeric not between 1 and 1000 then raise exception 'Configuração inválida'; end if;
 if estimated_price is null or estimated_price not between 0 and 100000000 then raise exception 'Estimativa inválida'; end if;
 if octet_length(customer_data::text)>10000 then raise exception 'Dados do cliente excedem o limite'; end if;
 pcode:='M3D-'||to_char(now(),'YYYY')||'-'||upper(substr(replace(pid::text,'-',''),1,8));
 insert into public.projects(id,organization_id,user_id,code,config,price,customer,status) values(pid,org,null,pcode,configuration,estimated_price,customer_data,'Orçamento');
 insert into public.leads(organization_id,project_id,name,phone,email) values(org,pid,cname,cphone,left(customer_data->>'email',254));
 return jsonb_build_object('id',pid,'code',pcode); end $$;
