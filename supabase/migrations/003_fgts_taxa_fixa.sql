-- =====================================================================
-- FinanceiroCasal: FGTS e rendimento por taxa fixa ao ano
-- Rode no SQL Editor do Supabase (pode rodar mais de uma vez sem problema).
-- Precisa ter rodado antes o 002_cdi_percent.sql.
-- =====================================================================

-- novo tipo de destino: fgts
alter table financeiro.destinations drop constraint if exists destinations_kind_check;
alter table financeiro.destinations
  add constraint destinations_kind_check check (kind in ('caixinha', 'investimento', 'fgts'));

-- taxa fixa em % ao ano (ex.: 3 = 3% a.a. do FGTS). Usada quando não há % do CDI.
alter table financeiro.destinations
  add column if not exists annual_rate numeric(6,2)
  check (annual_rate is null or (annual_rate >= 0 and annual_rate <= 100));
