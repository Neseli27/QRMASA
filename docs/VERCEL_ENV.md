# Vercel ortam değişkenleri

QRMASA Vite istemcisinin Firebase'e bağlanabilmesi için Vercel üzerinde aşağıdaki değişkenler hem **Preview** hem de **Production** ortamlarında tanımlanmalıdır:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Bu değerler Vite tarafından derleme zamanında uygulamaya gömülür. Değişkenler eklendikten veya değiştirildikten sonra yeni bir deployment oluşturulmalıdır.
