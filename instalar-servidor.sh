#!/usr/bin/env bash
# Instala e liga o Minha Voz num servidor Linux (Ubuntu), por exemplo a VM grátis da Oracle Cloud.
# Uso, dentro da pasta minha-voz no servidor:   bash instalar-servidor.sh
# Pode rodar de novo sempre que atualizar o código: ele mantém as senhas e os dados.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> 1/4 Instalando o Docker (só na primeira vez)"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
fi

echo "==> 2/4 Liberando as portas 80 e 443 no firewall do servidor"
# As imagens Ubuntu da Oracle bloqueiam tudo menos SSH por padrão.
for porta in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$porta" -j ACCEPT 2>/dev/null; then
    # entra antes da regra que rejeita o resto (se existir); senão, no fim
    linha=$(sudo iptables -L INPUT --line-numbers -n | awk '$2=="REJECT"{print $1; exit}')
    if [ -n "$linha" ]; then
      sudo iptables -I INPUT "$linha" -p tcp --dport "$porta" -j ACCEPT
    else
      sudo iptables -A INPUT -p tcp --dport "$porta" -j ACCEPT
    fi
  fi
done
if command -v netfilter-persistent >/dev/null; then sudo netfilter-persistent save >/dev/null; fi

echo "==> 3/4 Configurações (servidor.env)"
if [ ! -f servidor.env ]; then
  ip=$(curl -fsS https://api.ipify.org)
  senha() { tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24; }
  cat > servidor.env <<FIM
# Gerado por instalar-servidor.sh. Guarde este arquivo: ele tem as senhas do banco.
# DOMINIO: endereço do site. Com sslip.io não precisa comprar domínio. Se tiver um domínio seu, troque aqui.
DOMINIO=${ip//./-}.sslip.io
MYSQL_SENHA=$(senha)
MYSQL_SENHA_ROOT=$(senha)
FIM
  chmod 600 servidor.env
  echo "    Senhas novas criadas em servidor.env"
fi

echo "==> 4/4 Montando e ligando (a primeira vez demora alguns minutos)"
sudo docker compose --env-file servidor.env up -d --build

dominio=$(grep '^DOMINIO=' servidor.env | cut -d= -f2)
echo
echo "Pronto! Em 1 ou 2 minutos o site abre em: https://$dominio"
echo "Teste da API: https://$dominio/api/saude  (deve mostrar \"banco\": \"MySQL\")"
