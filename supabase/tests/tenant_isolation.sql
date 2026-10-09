-- Run with an administrative connection. Every fixture is rolled back.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','m3d-a-test@example.invalid'),
 ('10000000-0000-4000-8000-000000000002','m3d-b-test@example.invalid'),
 ('10000000-0000-4000-8000-000000000003','m3d-staff-test@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.create_organization('Teste isolamento A','m3d-isolation-a','Teste A');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select public.create_organization('Teste isolamento B','m3d-isolation-b','Teste B');
do $$ begin
 if (select count(*) from public.organizations) <> 1 then raise exception 'RLS organizations failed'; end if;
 if exists(select 1 from public.organizations where slug='m3d-isolation-a') then raise exception 'Cross tenant read exposed'; end if;
 update public.organizations set name='Attack' where slug='m3d-isolation-a';
 if found then raise exception 'Cross tenant update allowed'; end if;
end $$;
reset role;
insert into public.organization_members(organization_id,user_id,role)
 select id,'10000000-0000-4000-8000-000000000003','STAFF' from public.organizations where slug='m3d-isolation-a';
insert into public.catalog_items(organization_id,kind,source_id,name)
 select id,'model','guarda-roupa','Modelo A' from public.organizations where slug='m3d-isolation-a';
set local role anon;
do $$ begin
 if public.get_public_tenant('m3d-isolation-a')->'organization'->>'name' <> 'Teste isolamento A' then raise exception 'Public tenant failed'; end if;
 if public.get_public_tenant('no-such-tenant') is not null then raise exception 'Unknown tenant leaked'; end if;
end $$;
do $$ begin
 begin
  perform public.submit_tenant_quote('m3d-isolation-a','{"type":"guarda-roupa","width":240,"height":220,"depth":60}',0,'{"name":"Cliente Teste","phone":"5513999999999"}');
  raise exception 'Anonymous forged-price RPC was allowed';
 exception when insufficient_privilege then null; end;
end $$;
set local role service_role;
select public.submit_tenant_quote('m3d-isolation-a','{"type":"guarda-roupa","width":240,"height":220,"depth":60}',8450,'{"name":"Cliente Teste","phone":"5513999999999"}');
do $$ declare rejected boolean:=false; begin
 begin perform public.submit_tenant_quote('m3d-isolation-a','{"type":"guarda-roupa"}',8450,'{"name":"Cliente Teste","phone":"5513999999999"}');
 exception when others then rejected:=true; end;
 if not rejected then raise exception 'Missing dimensions accepted'; end if;
end $$;
set local role anon;
do $$ begin
 if (select count(*) from public.leads) <> 0 or (select count(*) from public.projects) <> 0 then raise exception 'Anonymous private data exposed'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin
 if (select count(*) from public.leads) <> 0 then raise exception 'Tenant B sees A leads'; end if;
 if (select count(*) from public.projects where organization_id is not null) <> 0 then raise exception 'Tenant B sees A projects'; end if;
 if (select count(*) from public.catalog_items) <> 0 then raise exception 'Tenant B sees A catalog'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$ begin
 if (select count(*) from public.leads) <> 1 then raise exception 'Staff cannot see own tenant lead'; end if;
 update public.leads set status='Em contato'; if not found then raise exception 'Staff cannot update lead'; end if;
 update public.catalog_items set name='Staff attack'; if found then raise exception 'Staff can mutate catalog'; end if;
 update public.organizations set name='Staff attack'; if found then raise exception 'Staff can mutate branding'; end if;
 begin
  update public.projects set organization_id=null,user_id=auth.uid();
  raise exception 'Staff detached organization project';
 exception when raise_exception then
  if sqlerrm not like 'O vínculo do projeto%' then raise; end if;
 end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ begin
 if (select count(*) from public.leads) <> 1 then raise exception 'Owner cannot see own lead'; end if;
 if (select count(*) from public.projects where organization_id is not null) <> 1 then raise exception 'Owner cannot see own project'; end if;
 update public.catalog_items set name='Catálogo atualizado'; if not found then raise exception 'Owner cannot edit catalog'; end if;
end $$;
reset role;
do $$ begin
 if app_private.valid_furniture_configuration('{"type":"guarda-roupa","width":null,"height":220,"depth":60}') then raise exception 'Null dimensions accepted'; end if;
 if app_private.valid_furniture_configuration('{"type":"guarda-roupa","width":240,"height":220,"depth":60,"columns":1000000000}') then raise exception 'Huge counters accepted'; end if;
 if app_private.valid_furniture_configuration('{"type":"no-such-model","width":240,"height":220,"depth":60}') then raise exception 'Unknown model accepted'; end if;
end $$;
select 'PASS: onboarding, tenant público, orçamento atômico, validação, isolamento A/B, STAFF/OWNER e vínculo imutável' as result;
set local role service_role;
do $$ declare i integer; rejected boolean:=false; begin
 for i in 1..4 loop
  perform public.submit_tenant_quote('m3d-isolation-a','{"type":"guarda-roupa","width":240,"height":220,"depth":60}',8450,'{"name":"Cliente Teste","phone":"5513999999999"}');
 end loop;
 begin
  perform public.submit_tenant_quote('m3d-isolation-a','{"type":"guarda-roupa","width":240,"height":220,"depth":60}',8450,'{"name":"Cliente Teste","phone":"5513999999999"}');
 exception when raise_exception then rejected:=sqlerrm like 'Você já enviou%'; end;
 if not rejected then raise exception 'Customer rate limit failed'; end if;
 for i in 1..25 loop
  perform public.submit_tenant_quote('m3d-isolation-a','{"type":"guarda-roupa","width":240,"height":220,"depth":60}',8450,jsonb_build_object('name','Cliente Teste','phone','55119'||lpad(i::text,8,'0')));
 end loop;
 rejected:=false;
 begin
  perform public.submit_tenant_quote('m3d-isolation-a','{"type":"guarda-roupa","width":240,"height":220,"depth":60}',8450,'{"name":"Cliente Teste","phone":"5511888888888"}');
 exception when raise_exception then rejected:=sqlerrm like 'Muitas solicitações%'; end;
 if not rejected then raise exception 'Tenant rate limit failed'; end if;
end $$;
select 'PASS: limite de 5 propostas por telefone/10min e 30 propostas por marcenaria/minuto' as result;
rollback;
