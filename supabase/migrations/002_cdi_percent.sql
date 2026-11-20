-- =====================================================================
-- FinanceiroCasal: % do CDI por caixinha/investimento
-- Rode no SQL Editor do Supabase (pode rodar mais de uma vez sem problema).
-- =====================================================================

-- % do CDI que a caixinha rende (ex.: 100 = 100% do CDI, 110 = 110% do CDI).
-- Vazio (null) = não rende pelo CDI (ex.: ações); aí o rendimento é lançado à mão.
alter table financeiro.destinations
  add column if not exists cdi_percent numeric(6,2)
  check (cdi_percent is null or (cdi_percent >= 0 and cdi_percent <= 1000));
