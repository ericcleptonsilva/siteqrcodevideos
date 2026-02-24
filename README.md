# Site de Vídeos Escolar com Hospedagem Própria

Este projeto é um site para exibir vídeos que podem ser hospedados diretamente no seu próprio Firebase Storage. Ele inclui um player de vídeo e um painel de administração protegido por senha.

## Como Configurar o Firebase

Para que o site funcione (upload e sincronização de configurações), você precisa conectar seu próprio projeto Firebase. Siga estes passos:

### 1. Criar Projeto no Firebase
1. Vá para o [Console do Firebase](https://console.firebase.google.com/).
2. Clique em "Adicionar projeto" e siga as instruções.

### 2. Ativar Serviços Necessários
No menu lateral do console do Firebase, ative:
- **Authentication**: Vá em "Sign-in method" e ative o provedor **Anônimo**.
- **Firestore Database**: Clique em "Criar banco de dados". Comece em "Modo de teste" para desenvolvimento inicial.
- **Cloud Storage**: Clique em "Começar agora". Comece em "Modo de teste" para permitir uploads.

### 3. Obter Credenciais
1. No Console do Firebase, clique no ícone de engrenagem (Configurações do Projeto).
2. Na aba "Geral", role para baixo até "Seus aplicativos" e adicione um aplicativo Web (ícone `</>`).
3. Copie o objeto `firebaseConfig`. Ele se parece com isto:
   ```javascript
   const firebaseConfig = {
     apiKey: "SUA_API_KEY",
     authDomain: "SEU_PROJETO.firebaseapp.com",
     projectId: "SEU_PROJETO",
     storageBucket: "SEU_PROJETO.appspot.com",
     messagingSenderId: "SEU_ID",
     appId: "SEU_APP_ID"
   };
   ```

### 4. Configurar no Código
1. Abra o arquivo `src/App.jsx`.
2. Localize a constante `localFirebaseConfig` (por volta da linha 13).
3. Substitua os valores vazios pelas credenciais que você copiou.

```javascript
const localFirebaseConfig = {
  apiKey: "SUA_API_KEY",
  // ... outros campos
};
```

---

## Google Drive como Alternativa
Se você preferir não usar o Firebase Storage, você pode usar vídeos do Google Drive:
1. Faça o upload do vídeo no Google Drive.
2. Clique com o botão direito -> **Compartilhar** -> Mude para **Qualquer pessoa com o link**.
3. Copie o link e cole no campo "URL Direta do Vídeo" no painel de administração.
4. O site detectará automaticamente o link e o exibirá usando um player integrado.

## Funcionalidades
- **Player Imersivo**: Clique para ver em tela cheia.
- **Hospedagem de Vídeo**: Suba vídeos (.mp4) diretamente pelo painel admin para o Firebase Storage.
- **Suporte a Google Drive**: Funciona automaticamente com links de compartilhamento do Drive.
- **Painel Admin**: Altere a senha e o vídeo exibido em tempo real.
- **Modo Demo**: O site guia você através da configuração caso o Firebase ainda não esteja conectado.
