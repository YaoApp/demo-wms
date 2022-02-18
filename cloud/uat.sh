#!/bin/bash

VERSION=$(xiang version)

# 清理工作目录
rm -rf .tmp

# 创建工作目录
mkdir -p .tmp/source
git clone git@github.com:YaoApp/warehouse.git .tmp/source
mkdir -p .tmp/source/cloud/bin

# 复制文件
cp ~/Code/bin/xiang-$VERSION-linux-amd64 .tmp/source/cloud/bin/warehouse
cp .tmp/source/cloud/online.env .tmp/source/cloud/.env
chmod +x .tmp/source/cloud/bin/warehouse

# 删除 Git 目录
rm -rf .tmp/source/.git
rm -rf .tmp/source/db/*
rm -rf .tmp/source/plugins/*
rm -rf .tmp/source/*.sh


# 应用文件打包
cd .tmp/source/cloud && tar cvfz ../../dist.tar.gz . && cd ../../..

# 上传到服务器
scp .tmp/dist.tar.gz root@139.199.30.36:/root/dist-warehouse.tar.gz
ssh root@139.199.30.36 '''rm -rf /data/warehouse'''
ssh root@139.199.30.36 '''mkdir -p /data/warehouse/logs'''
ssh root@139.199.30.36 '''cd /data/warehouse && tar xvfz /root/dist-warehouse.tar.gz'''
ssh root@139.199.30.36 '''supervisorctl reload'''
ssh root@139.199.30.36 '''supervisorctl stop warehouse-server >> /dev/null'''
ssh root@139.199.30.36 '''rm -rf /etc/supervisor/conf.d/warehouse.conf'''
ssh root@139.199.30.36 '''ln -s  /data/warehouse/supervisor/online.conf /etc/supervisor/conf.d/warehouse.conf'''
ssh root@139.199.30.36 '''supervisorctl start warehouse-server >> /dev/null'''
ssh root@139.199.30.36 '''supervisorctl reload'''
ssh root@139.199.30.36 '''cd /data/warehouse && /data/warehouse/bin/warehouse migrate && /data/warehouse/bin/warehouse run flows.init.menu && /data/warehouse/bin/warehouse run flows.demo.data >> /dev/null'''

# 清理工作目录
rm -rf .tmp