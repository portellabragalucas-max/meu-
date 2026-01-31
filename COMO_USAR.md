# 🚀 Como Fazer o Nexora Funcionar

## Passo a Passo Rápido

### 1. Abrir o Terminal
Abra o PowerShell ou Terminal no diretório do projeto:
```powershell
cd C:\Users\lucas\nexora
```

### 2. Iniciar o Servidor de Desenvolvimento
Execute o comando:
```powershell
npm run dev
```

### 3. Acessar a Aplicação
Abra seu navegador e acesse:
```
http://localhost:3000
```

## ✅ Status Atual

- ✅ **Código corrigido** - Imports de tipos corrigidos
- ✅ **Dependências instaladas** - node_modules presente
- ✅ **Servidor iniciado** - Deve estar rodando em background

## 🎯 O Que Você Verá

A aplicação irá:
1. Redirecionar automaticamente para `/dashboard`
2. Mostrar um dashboard com dados mockados (demonstração)
3. Permitir navegação entre as páginas:
   - Dashboard
   - Planner (Agendador)
   - Subjects (Disciplinas)
   - Analytics (Análises)
   - Settings (Configurações)

## 🔧 Se Algo Não Funcionar

### Erro: "Port 3000 already in use"
Pare o servidor anterior ou use outra porta:
```powershell
npm run dev -- -p 3001
```

### Erro: "Module not found"
Reinstale as dependências:
```powershell
npm install
```

### Erro: "Prisma Client not generated"
Gere o cliente Prisma (opcional, pois usa dados mockados):
```powershell
npm run db:generate
```

## 📝 Nota Importante

A aplicação está configurada para usar **dados mockados** (simulados), então:
- ✅ Funciona sem banco de dados
- ✅ Não precisa configurar Prisma agora
- ✅ Pode testar todas as funcionalidades

## 🎉 Pronto!

Agora é só acessar `http://localhost:3000` e começar a usar!
