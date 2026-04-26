-- ApexTuner — reference seed data
-- Idempotent: re-running is safe thanks to ON CONFLICT clauses.

-- =============================================================
-- Cars: 10 iconic Gran Turismo 7 picks across categories
-- =============================================================
insert into public.cars (make, model, year, drivetrain, category) values
  ('Nissan',          'Skyline GT-R V-Spec II Nür (R34)',     2002, '4WD', 'N500'),
  ('Porsche',         '911 GT3 RS (991)',                     2016, 'RR',  'N700'),
  ('Mazda',           '787B',                                 1991, 'MR',  'Gr.1'),
  ('Toyota',          'GR Supra RZ',                          2020, 'FR',  'N500'),
  ('Honda',           'NSX Type R',                           1992, 'MR',  'N400'),
  ('Lamborghini',     'Countach 25th Anniversary',            1988, 'MR',  'N500'),
  ('Ferrari',         'F40',                                  1992, 'MR',  'N600'),
  ('Mercedes-AMG',    'AMG GT3',                              2016, 'FR',  'Gr.3'),
  ('Subaru',          'WRX STI Type S',                       2014, '4WD', 'N300'),
  ('Chevrolet',       'Corvette ZR1 (C7)',                    2019, 'FR',  'N700')
on conflict (make, model, year) do nothing;

-- =============================================================
-- Tracks: 3 marquee circuits
-- =============================================================
insert into public.tracks (name, layout, country) values
  ('Nürburgring',                    'Nordschleife', 'Germany'),
  ('Tsukuba Circuit',                'Full Track',   'Japan'),
  ('Circuit de Spa-Francorchamps',   'Full Track',   'Belgium')
on conflict (name, layout) do nothing;
