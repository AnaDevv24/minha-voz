# Publicar o Minha Voz na internet de graça (Oracle Cloud Always Free)

No final você tem um **servidor Linux só seu, grátis**, com:

- o app e a API Flask em **https://SEU-IP.sslip.io** (HTTPS automático, sem comprar domínio);
- um **MySQL 8** completo, do jeito que você quiser configurar;
- espaço para colocar **outros sites** no mesmo servidor depois.

Tudo roda em Docker: o script `instalar-servidor.sh` instala, gera senhas fortes e liga.

---

## 1. Criar a conta

1. Acesse https://www.oracle.com/br/cloud/free/ e clique em **Comece gratuitamente**.
2. Na **região inicial (Home Region)** escolha **Brazil East (São Paulo)** ou **Brazil Southeast (Vinhedo)**.
   Ela não pode ser trocada depois.
3. O cartão é pedido só para confirmar a identidade. Os recursos marcados como **Always Free** não são cobrados.

## 2. Criar o servidor (VM)

1. No painel: **☰ > Compute > Instances > Create instance**.
2. **Image**: clique em *Change image* e escolha **Canonical Ubuntu 24.04**.
3. **Shape**: *Change shape* > **Ampere** > **VM.Standard.A1.Flex**, com **2 OCPUs e 12 GB** de memória
   (tem a etiqueta *Always Free eligible*).
   - Se aparecer *Out of capacity*, tente outro *Availability domain*, tente mais tarde, ou use
     **VM.Standard.E2.1.Micro** (também grátis, mas com só 1 GB de memória).
4. **Networking**: deixe criar a rede nova e marque **Assign a public IPv4 address**.
5. **Add SSH keys**: escolha **Generate a key pair for me** e clique em **Save private key**.
   Guarde esse arquivo `.key` (ex.: em `C:\Users\grego\oracle\chave.key`). Sem ele não dá para entrar no servidor.
6. Clique em **Create**. Quando ficar verde (*Running*), anote o **Public IP address**.

## 3. Abrir as portas do site na Oracle

1. Na página da instância, clique no nome da **Subnet** e depois na **Security List** (Default Security List...).
2. **Add Ingress Rules**: *Source CIDR* `0.0.0.0/0`, *IP Protocol* TCP, *Destination Port Range* `80,443`.
   Clique em **Add Ingress Rules**.

(Não abra a porta 3306: o MySQL fica fechado para a internet de propósito.)

## 4. Enviar o projeto e instalar

No **PowerShell** do seu computador, na pasta onde estão a chave e o `minha-voz-projeto.zip`
(troque `IP` pelo IP do passo 2):

```
icacls chave.key /inheritance:r /grant:r "$($env:USERNAME):(R)"
scp -i chave.key minha-voz-projeto.zip ubuntu@IP:~
ssh -i chave.key ubuntu@IP
```

(O primeiro comando só arruma a permissão da chave, senão o Windows recusa usar. Na primeira conexão, digite `yes`.)

Agora você está **dentro do servidor**. Rode:

```
sudo apt-get update && sudo apt-get install -y unzip
unzip -o minha-voz-projeto.zip
cd minha-voz
bash instalar-servidor.sh
```

A primeira vez demora alguns minutos. No final aparece o endereço, algo como
**https://150-230-10-20.sslip.io**. Abra no navegador e mande para quem quiser.
Teste também `https://.../api/saude`, que deve mostrar `"banco": "MySQL"`.

As senhas do banco ficam no arquivo `servidor.env`, dentro do servidor (o script cria sozinho).

## 5. Atualizar depois de mudar o código

Gere um zip novo do projeto **sem a pasta `node_modules`** (ou use o zip que eu te mandar), envie com o
mesmo `scp` e, no servidor:

```
unzip -o minha-voz-projeto.zip && cd minha-voz && bash instalar-servidor.sh
```

Os dados e as senhas continuam (eles não estão no zip).

## 6. Ver o banco pelo MySQL Workbench

1. Workbench > **+** (nova conexão) > *Connection Method*: **Standard TCP/IP over SSH**.
2. *SSH Hostname*: `IP`  ·  *SSH Username*: `ubuntu`  ·  *SSH Key File*: o `chave.key`.
3. *MySQL Hostname*: `127.0.0.1`  ·  *Port*: `3306`  ·  *Username*: `root`.
4. A senha é a `MYSQL_SENHA_ROOT`. Para ver, no servidor: `cat ~/minha-voz/servidor.env`.

## 7. Cópia de segurança

No servidor, dentro de `~/minha-voz`:

```
source servidor.env
sudo docker compose --env-file servidor.env exec -T banco mysqldump -uroot -p"$MYSQL_SENHA_ROOT" minha_voz > backup-$(date +%F).sql
```

Para trazer o backup para o seu computador: `scp -i chave.key ubuntu@IP:~/minha-voz/backup-*.sql .`

## 8. Colocar outro site no mesmo servidor

O `Caddyfile` já tem um exemplo comentado: cada site ganha um bloco com o endereço dele
(ex.: `outrosite.150-230-10-20.sslip.io`) e o serviço para onde ele aponta, e o serviço entra no
`docker-compose.yml`. Depois é só `sudo docker compose --env-file servidor.env up -d`.

## Bom saber

- Se o script der erro com `$'\r'`, é porque o Windows mudou o fim das linhas do arquivo. No servidor, rode
  `sed -i 's/\r$//' instalar-servidor.sh` e tente de novo.
- **Comandos úteis no servidor:** `sudo docker compose --env-file servidor.env ps` (o que está ligado),
  `... logs app --tail 50` (erros da API), `... restart` (reiniciar).
- O servidor reinicia sozinho os serviços se a VM for reiniciada.
- A Oracle pode desligar instâncias grátis que ficam **paradas por muito tempo** (quase sem uso por vários dias).
  Se acontecer, é só ligar de novo em *Instances > Start*. Os dados continuam no disco.
- Quer um endereço bonito (ex.: `minhavoz.com.br`)? Compre o domínio, aponte para o IP e troque `DOMINIO` no
  `servidor.env`; depois rode `bash instalar-servidor.sh` de novo.
- O login de demonstração (`mediador@escola.com` / `12345678`) é público. Para uso real, cada pessoa cria a própria conta.
