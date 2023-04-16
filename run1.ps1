# # Đi đến thư mục `client`
# cd client

# Chạy 5 process bằng vòng for
for ($i=1; $i -le 5; $i++) {
    Start-Process yarn -ArgumentList "run", "client"
}
