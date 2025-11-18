-- Criar primeiro usuário admin
-- Email: admin@leapscout.com
-- Senha: LeapScout2025! (altere depois do primeiro login)

INSERT INTO "User" (
  id,
  email,
  password,
  name,
  role,
  "createdAt",
  "updatedAt",
  "isActive"
) VALUES (
  'admin-001',
  'admin@leapscout.com',
  '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', -- senha: LeapScout2025!
  'Admin',
  'admin',
  NOW(),
  NOW(),
  true
);
