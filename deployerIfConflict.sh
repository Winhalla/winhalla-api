cd C:/Codage/API
git push
sleep 15
gcloud compute ssh winhalla-backend --command="sudo pm2 pull index"
git checkout master
echo "Backend deployment done ! :yay:"
sleep 45