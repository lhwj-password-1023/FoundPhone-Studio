#!/bin/zsh
cd -- "${0:A:h}" || exit 1
if [[ -d 网页 ]]; then cd 网页; else cd ../dist || exit 1; fi
ip=""
for interface in $(/usr/sbin/networksetup -listallhardwareports | awk '/Device:/{print $2}'); do
  ip=$(/usr/sbin/ipconfig getifaddr "$interface" 2>/dev/null) && [[ -n "$ip" ]] && break
done
[[ -n "$ip" ]] || { echo "请将 Mac 连上 Wi-Fi，再重新打开。"; exit 1; }
echo "手机和 Mac 连同一 Wi-Fi，然后在手机 Safari 输入："
echo "  从头测试  http://$ip:4198/?play=fresh"
echo "  保存进度  http://$ip:4198/"
echo "试玩期间保持这个窗口打开。"
exec /usr/bin/python3 -m http.server 4198 --bind "$ip"
