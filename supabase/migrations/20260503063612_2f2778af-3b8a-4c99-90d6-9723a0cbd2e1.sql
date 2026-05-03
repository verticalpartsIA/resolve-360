-- Enum de papéis
CREATE TYPE public.app_role AS ENUM ('operador', 'gestor', 'admin');

-- Tabela de perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  departamento TEXT,
  telefone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tabela de papéis
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-criar profile + role no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operador');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Policies profiles
CREATE POLICY "Profiles visíveis para autenticados"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuário edita seu próprio profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Usuário insere seu próprio profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policies user_roles
CREATE POLICY "Roles visíveis para autenticados"
ON public.user_roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin gerencia roles - insert"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia roles - update"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia roles - delete"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));