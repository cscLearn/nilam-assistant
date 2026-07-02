// ==UserScript==
// @name         NILAM JSON Assistant
// @namespace    https://github.com/cscLearn/nilam-assistant
// @version      2.0.3
// @description  Auto-fill AINS NILAM book records deterministically synced with Cloudflare Worker.
// @author       cscLearn
// @match        https://ains.moe.gov.my/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      raw.githubusercontent.com
// @connect      *
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// @updateURL    https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-assistant.user.js
// @downloadURL  https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-assistant.user.js
// ==/UserScript==

(function () {
  "use strict";

  // Configuration
  const WORKER_URL = "https://nilam-progress-sync.suiyun.workers.dev"; // Replace with your Cloudflare Worker URL
  const STORE_KEY = "nilam_assistant_state_v2";

  // Embedded Data & Dictionaries
  const capitalizeWords = (str) =>
    str.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const bmFictionTemplates = [
    {
      title: (n, h, t, b, s, hl) => `Kisah Sang ${capitalizeWords(h)} yang ${capitalizeWords(s)}`,
      rumusan: (n, h, t, b, s, hl) => `Buku ini menceritakan tentang seekor ${h} bernama Sang ${capitalizeWords(h)} yang sangat ${s} dalam hidupnya. Apabila dia terjumpa ${b} yang hilang di ${t}, dia berusaha mencari pemilik asalnya tanpa mengharapkan sebarang ganjaran.`,
      lesson: (n, h, t, b, s, sn) => `Kita hendaklah sentiasa bersikap ${s} dan mengamalkan nilai ${sn} dalam kehidupan seharian.`
    },
    {
      title: (n, h, t, b, s, hl) => `${n} dan Misteri ${capitalizeWords(b)} Ajaib`,
      rumusan: (n, h, t, b, s, hl) => `Mengisahkan seorang kanak-kanak bernama ${n} yang menemui sebuah ${b} ajaib di belakang rumahnya dekat ${t}. Barangan tersebut membantunya menyelesaikan pelbagai masalah tetapi mengajarnya bahawa usaha sendiri lebih bernilai daripada keajaiban.`,
      lesson: (n, h, t, b, s, sn) => `Kita tidak boleh bergantung kepada jalan pintas, sebaliknya perlu berusaha keras dengan kebolehan diri sendiri.`
    },
    {
      title: (n, h, t, b, s, hl) => `Pengembaraan Sang ${capitalizeWords(h)} di ${t}`,
      rumusan: (n, h, t, b, s, hl) => `Buku ini mengikuti pengembaraan seekor Sang ${capitalizeWords(h)} yang bijak menerokai kawasan ${t}. Di sana, dia bekerjasama dengan haiwan-haiwan lain untuk menyelamatkan habitat mereka daripada bahaya pencemaran.`,
      lesson: (n, h, t, b, s, sn) => `Semangat kerjasama dan perpaduan ialah kunci kejayaan dalam menghadapi sebarang cabaran besar.`
    },
    {
      title: (n, h, t, b, s, hl) => `Impian ${n} Memiliki ${capitalizeWords(b)}`,
      rumusan: (n, h, t, b, s, hl) => `${n} sangat mengimpikan untuk mempunyai ${b} sendiri untuk dibawa ke sekolah. Melalui bimbingan bapanya, dia mula belajar menyimpan wang saku sedikit demi sedikit sehinggalah impiannya tercapai dengan bangga.`,
      lesson: (n, h, t, b, s, sn) => `Sikap sabar, berjimat cermat dan gigih berusaha adalah penting untuk mencapai cita-cita yang diidamkan.`
    },
    {
      title: (n, h, t, b, s, hl) => `Sang ${capitalizeWords(h)} Mencari Sahabat Sebenar`,
      rumusan: (n, h, t, b, s, hl) => `Sang ${capitalizeWords(h)} berasa sunyi lalu mengembara ke ${t} untuk mencari kawan baharu. Sepanjang perjalanan, dia belajar adab menghormati orang lain dan kepentingan bertutur dengan kata-kata yang sopan.`,
      lesson: (n, h, t, b, s, sn) => `Adab sopan dan tutur kata yang baik adalah asas utama dalam membina persahabatan yang erat dan harmoni.`
    },
    {
      title: (n, h, t, b, s, hl) => `Misteri Laluan Rahsia di ${t}`,
      rumusan: (n, h, t, b, s, hl) => `Sekumpulan kawan yang diketuai oleh ${n} menemui laluan rahsia di belakang ${t}. Mereka bekerjasama menyelesaikan teka-teki kuno untuk mendedahkan sejarah lama kawasan tempat tinggal mereka.`,
      lesson: (n, h, t, b, s, sn) => `Perasaan ingin tahu yang positif mendorong kita mempelajari sejarah dan perkara baharu yang bermanfaat.`
    },
    {
      title: (n, h, t, b, s, hl) => `Hari yang Sibuk bagi ${n}`,
      rumusan: (n, h, t, b, s, hl) => `Mengisahkan aktiviti seharian ${n} yang sangat ringan tulang membantu ibunya mengemas rumah, menyiram pokok bunga dan menolong jiran yang memerlukan di sekitar ${t}.`,
      lesson: (n, h, t, b, s, sn) => `Sikap rajin membantu keluarga dan komuniti membawa kebahagiaan serta mengeratkan hubungan persaudaraan.`
    },
    {
      title: (n, h, t, b, s, hl) => `Sang ${capitalizeWords(h)} Belajar Berkongsi Rezeki`,
      rumusan: (n, h, t, b, s, hl) => `Sang ${capitalizeWords(h)} enggan berkongsi makanan dan ${b} dengan rakan-rakannya di ${t}. Namun, apabila dia sendiri menghadapi kesukaran dan kelaparan, barulah dia menyedari kepentingan sifat berkongsi.`,
      lesson: (n, h, t, b, s, sn) => `Sifat pemurah dan sudi berkongsi rezeki akan mendatangkan berkat dan mengeratkan hubungan sesama rakan.`
    },
    {
      title: (n, h, t, b, s, hl) => `Tabung Buluh ${n}`,
      rumusan: (n, h, t, b, s, hl) => `Buku ini mengisahkan ${n} yang belajar tentang pengurusan wang daripada datuknya. Dia menggunakan tabung buluh untuk menyimpan baki wang saku demi membeli ${b} idaman tanpa menyusahkan ibu bapanya.`,
      lesson: (n, h, t, b, s, sn) => `Amalan menabung sejak kecil membantu kita berdikari dan lebih menghargai nilai setiap barangan.`
    },
    {
      title: (n, h, t, b, s, hl) => `Keberanian Sang ${capitalizeWords(h)} Kecil`,
      rumusan: (n, h, t, b, s, hl) => `Menceritakan tentang Sang ${capitalizeWords(h)} yang bertubuh kecil tetapi berjiwa besar. Dia menyelamatkan rakan-rakannya di ${t} daripada ancaman haiwan yang lebih besar menggunakan kebijaksanaan akalnya.`,
      lesson: (n, h, t, b, s, sn) => `Kebijaksanaan akal fikiran dan keberanian bertindak lebih berkesan daripada kekuatan fizikal semata-mata.`
    },
    {
      title: (n, h, t, b, s, hl) => `Hadiah Istimewa untuk ${n}`,
      rumusan: (n, h, t, b, s, hl) => `Mengisahkan ${n} yang menerima ${b} daripada datuknya sebelum datuknya berpindah. Hadiah tersebut bukan sekadar barang biasa, tetapi mengandungi pesanan bertulis yang sangat berharga tentang nilai kehidupan.`,
      lesson: (n, h, t, b, s, sn) => `Kita haruslah menghargai setiap pemberian orang lain terutamanya pesanan bernilai daripada golongan tua.`
    },
    {
      title: (n, h, t, b, s, hl) => `Sang ${capitalizeWords(h)} Penjaga ${t}`,
      rumusan: (n, h, t, b, s, hl) => `Sang ${capitalizeWords(h)} berasa sedih melihat kawasan ${t} dipenuhi sampah-sarap akibat perbuatan pengunjung yang tidak bertanggungjawab. Dia mengetuai kempen membersihkan kawasan tersebut bersama semua penduduk hutan.`,
      lesson: (n, h, t, b, s, sn) => `Menjaga kebersihan dan kelestarian alam sekitar adalah tanggungjawab kita bersama demi kesihatan semua.`
    },
    {
      title: (n, h, t, b, s, hl) => `Pertandingan Bakat di ${t}`,
      rumusan: (n, h, t, b, s, hl) => `${n} menyertai pertandingan bakat kreatif di ${t}. Walaupun dia menghadapi kegagalan pada awalnya, dia terus berlatih tanpa jemu sehinggalah berjaya memenangi anugerah khas.`,
      lesson: (n, h, t, b, s, sn) => `Kunci kejayaan utama ialah keazaman yang tinggi dan keengganan untuk menyerah kalah sebelum berjuang.`
    },
    {
      title: (n, h, t, b, s, hl) => `Sikap Jujur ${n}`,
      rumusan: (n, h, t, b, s, hl) => `Mengisahkan ${n} yang tersilap merosakkan ${b} kepunyaan rakannya di sekolah. Walaupun takut dimarahi, dia memilih untuk mengaku kesalahannya dengan jujur dan meminta maaf secara ikhlas.`,
      lesson: (n, h, t, b, s, sn) => `Sikap jujur and berani mengaku kesalahan sendiri akan membina kepercayaan yang utuh dalam persahabatan.`
    },
    {
      title: (n, h, t, b, s, hl) => `Kembara ${n} ke Kampung halaman`,
      rumusan: (n, h, t, b, s, hl) => `Buku ini menceritakan perjalanan percutian ${n} pulang ke kampung datuknya di ${t}. Di sana, dia belajar mengenali pelbagai jenis pokok herba tradisional dan cara menghormati orang tua di kampung.`,
      lesson: (n, h, t, b, s, sn) => `Menghargai tradisi keluarga dan menghormati datuk nenek mengukuhkan lagi nilai kekeluargaan kita.`
    },
    {
      title: (n, h, t, b, s, hl) => `Kisah Sang ${capitalizeWords(h)} yang Sombong`,
      rumusan: (n, h, t, b, s, hl) => `Sang ${capitalizeWords(h)} sering berbangga dengan kepantasan dan kekuatannya di ${t}. Suatu hari, dia kalah dalam satu perlumbaan penting menentang Sang ${hl} yang sangat sabar dan fokus.`,
      lesson: (n, h, t, b, s, sn) => `Sifat sombong hanya akan membawa kerugian, manakala sikap rendah diri dan sabar membawa kejayaan.`
    },
    {
      title: (n, h, t, b, s, hl) => `Misteri Buku Latihan ${n}`,
      rumusan: (n, h, t, b, s, hl) => `Buku latihan sekolah milik ${n} hilang secara misteri sebelum kelas bermula. Dia bersama rakannya menyiasat kes tersebut di sekitar sekolah dan menemui jalan penyelesaian yang penuh pengajaran.`,
      lesson: (n, h, t, b, s, sn) => `Bekerjasama dalam kumpulan membantu menyelesaikan masalah dengan lebih pantas dan harmoni.`
    },
    {
      title: (n, h, t, b, s, hl) => `Sang ${capitalizeWords(h)} yang Cergas dan Sihat`,
      rumusan: (n, h, t, b, s, hl) => `Sang ${capitalizeWords(h)} sentiasa mengamalkan aktiviti bersenam setiap pagi di ${t}. Dia mengajak rakan-rakannya yang sering malas dan sakit untuk turut serta demi kesihatan jangka panjang.`,
      lesson: (n, h, t, b, s, sn) => `Menjaga kesihatan diri dan rajin bersenam adalah tanggungjawab penting untuk hidup sejahtera.`
    },
    {
      title: (n, h, t, b, s, hl) => `Kawan Baharu dari ${t}`,
      rumusan: (n, h, t, b, s, hl) => `Mengisahkan kedatangan seorang murid baharu bernama ${n} yang berpindah dari ${t}. Watak utama menyambutnya dengan mesra dan membantunya menyesuaikan diri dengan persekitaran sekolah baharu.`,
      lesson: (n, h, t, b, s, sn) => `Sikap mesra, ramah dan prihatin terhadap orang baharu memupuk suasana perpaduan yang indah.`
    },
    {
      title: (n, h, t, b, s, hl) => `Bengkel Kreatif Cilik ${n}`,
      rumusan: (n, h, t, b, s, hl) => `${n} sangat kreatif dalam membaiki ${b} yang telah rosak di rumahnya. Dia menggunakannya semula secara inovatif daripada membuangnya, sekali gus menjimatkan perbelanjaan keluarga.`,
      lesson: (n, h, t, b, s, sn) => `Kreativiti dan sikap berjimat cermat membantu mengurangkan pembaziran barangan harian kita.`
    }
  ];

  const bmNonFictionTemplates = [
    {
      title: (t) => `Mari Kenal Dunia ${capitalizeWords(t)}`,
      rumusan: (t) => `Buku sains ini memperkenalkan topik ${t} secara ringkas dan menarik untuk kanak-kanak sekolah rendah. Ia dilengkapi dengan gambar rajah berwarna-warni dan eksperimen sains ringkas.`,
      lesson: "Mendidik murid-murid untuk menghargai ilmu sains dan memupuk rasa ingin tahu tentang alam di sekitar kita."
    },
    {
      title: (t) => `Kepentingan ${capitalizeWords(t)} dalam Kehidupan Kita`,
      rumusan: (t) => `Membincangkan kepentingan dan peranan utama ${t} dalam kehidupan seharian manusia, tumbuhan dan haiwan serta cara-cara mengekalkan kelestariannya.`,
      lesson: "Kita hendaklah sentiasa menghargai sumber alam dan mengamalkan nilai bertanggungjawab terhadap ekosistem."
    },
    {
      title: (t) => `Panduan Praktikal Mengurus ${capitalizeWords(t)}`,
      rumusan: (t) => `Menyediakan panduan praktikal dan langkah mudah untuk memahami serta menguruskan isu berkaitan ${t} secara bijak di rumah mahupun di sekolah.`,
      lesson: "Mengajar murid untuk bertanggungjawab, bersikap rasional dan menjaga kebersihan dalam rutin harian."
    },
    {
      title: (t) => `Fakta Menarik dan Keunikan ${capitalizeWords(t)}`,
      rumusan: (t) => `Mengandungi pelbagai fakta unik dan maklumat menarik yang jarang diketahui tentang ${t} untuk merangsang minda cerdas pembaca muda.`,
      lesson: "Menimbulkan minat ingin tahu dan memupuk sifat rajin membaca dalam kalangan murid sekolah."
    },
    {
      title: (t) => `Cara-cara Memelihara Kelestarian ${capitalizeWords(t)}`,
      rumusan: (t) => `Menhuraikan kaedah saintifik dan langkah yang betul untuk menjaga serta memelihara ${t} demi kebaikan generasi masa kini dan masa depan.`,
      lesson: "Kita hendaklah sentiasa bekerjasama menjaga kebersihan dan kelestarian alam sekitar di sekeliling kita."
    },
    {
      title: (t) => `Pengenalan Awal Kepada Sains ${capitalizeWords(t)}`,
      rumusan: (t) => `Sebuah buku rujukan awal yang membincangkan konsep asas ${t} dengan menggunakan bahasa yang amat mudah difahami berserta glosari istilah.`,
      lesson: "Mempelajari perkara sains baharu membantu meluaskan ufuk pemikiran dan meningkatkan pencapaian akademik murid."
    },
    {
      title: (t) => `Misteri di Sebalik ${capitalizeWords(t)}`,
      rumusan: (t) => `Membongkar rahsia dan keunikan fenomena ${t} serta impak langsungnya kepada kestabilan ekosistem sejagat dan hidupan lain.`,
      lesson: "Setiap ciptaan alam semula jadi mempunyai peranan, keunikan dan nilai yang tersendiri."
    },
    {
      title: (t) => `Sains dan Teknologi ${capitalizeWords(t)}`,
      rumusan: (t) => `Menerangkan konsep sains fizikal dan aplikasi teknologi moden di sebalik kewujudan serta fungsi ${t} dalam tamadun manusia.`,
      lesson: "Sains dan teknologi membantu kita memahami dunia dengan lebih mendalam, rasional dan logik."
    },
    {
      title: (t) => `Kembara Eksplorasi Keindahan ${capitalizeWords(t)}`,
      rumusan: (t) => `Membawa pembaca mengembara secara visual untuk menerokai keindahan serta keunikan struktur ${t} yang mempesonakan di seluruh dunia.`,
      lesson: "Mempunyai sifat ingin tahu adalah kunci utama kepada pembelajaran sepanjang hayat dan kecemerlangan diri."
    },
    {
      title: (t) => `Ekosistem dan Pemeliharaan ${capitalizeWords(t)}`,
      rumusan: (t) => `Menonjolkan peranan kepelbagaian biologi yang terdapat pada ${t} melalui penerangan ringkas, peta minda dan gambar foto yang menarik.`,
      lesson: "Keindahan dan keseimbangan alam semula jadi patut dihargai serta dipelihara dengan baik oleh semua pihak."
    }
  ];

  const enFictionTemplates = [
    {
      title: (n, h, t, b, s, hl) => `The Story of the ${capitalizeWords(s)} Little ${capitalizeWords(h)}`,
      rumusan: (n, h, t, b, s, hl) => `This book tells the heartwarming story of a little ${h} named Barnaby who was very ${s}. When he found a lost ${b} in the ${t}, he went on a long journey to return it to its rightful owner.`,
      lesson: (n, h, t, b, s, sn) => `We should always practice the value of ${sn} and do the right thing, even when no one is watching.`
    },
    {
      title: (n, h, t, b, s, hl) => `${n} and the Mystery of the Magic ${capitalizeWords(b)}`,
      rumusan: (n, h, t, b, s, hl) => `Follows the journey of a young boy named ${n} who discovers a magical ${b} near the ${t}. The magic object helps him with his daily chores but teaches him that honest effort is better than magic.`,
      lesson: (n, h, t, b, s, sn) => `Relying on shortcut methods is never sustainable; hard work and self-reliance are the keys to true success.`
    },
    {
      title: (n, h, t, b, s, hl) => `The Great Adventure of ${capitalizeWords(h)} in ${t}`,
      rumusan: (n, h, t, b, s, hl) => `Join a clever little ${h} as it embarks on an exciting adventure across the beautiful ${t}. Along the way, the animal cooperates with other creatures to protect their forest home from danger.`,
      lesson: (n, h, t, b, s, sn) => `Unity and teamwork make it much easier to solve big problems and overcome unexpected challenges.`
    },
    {
      title: (n, h, t, b, s, hl) => `${n}'s Dream of Having a ${capitalizeWords(b)}`,
      rumusan: (n, h, t, b, s, hl) => `${n} dreams of owning a new ${b} to bring to school. With the guidance of his parents, he begins to save his allowance daily and helps with chores to achieve his goal.`,
      lesson: (n, h, t, b, s, sn) => `Patience, financial discipline, and steady effort are essential when working toward a personal goal.`
    },
    {
      title: (n, h, t, b, s, hl) => `The Little ${capitalizeWords(h)} Looks for a True Friend`,
      rumusan: (n, h, t, b, s, hl) => `A lonely little ${h} travels all the way to ${t} in search of new friends. During the trip, the animal learns how polite words, sharing, and good manners make a big difference.`,
      lesson: (n, h, t, b, s, sn) => `Good manners and kind words are the main foundation of any lasting and meaningful friendship.`
    },
    {
      title: (n, h, t, b, s, hl) => `Mystery of the Hidden Path in ${t}`,
      rumusan: (n, h, t, b, s, hl) => `A group of school friends led by ${n} discovers a hidden path behind the ${t}. Together, they work to solve ancient riddles and uncover the old history of their neighborhood.`,
      lesson: (n, h, t, b, s, sn) => `Positive curiosity drives us to learn history and discover new useful knowledge about our world.`
    },
    {
      title: (n, h, t, b, s, hl) => `A Very Busy Day for ${n}`,
      rumusan: (n, h, t, b, s, hl) => `This story follows the busy day of ${n}, who happily helps his mother clean the house, water the garden, and help an elderly neighbor in ${t}.`,
      lesson: (n, h, t, b, s, sn) => `Being helpful to our family and local community brings happiness to ourselves and joy to others.`
    },
    {
      title: (n, h, t, b, s, hl) => `The Greedy ${capitalizeWords(h)} Learns to Share`,
      rumusan: (n, h, t, b, s, hl) => `A selfish little ${h} refuses to share food and toys with other animals in ${t}. When he gets stuck in a tricky situation, he realizes how important sharing is.`,
      lesson: (n, h, t, b, s, sn) => `Being generous and willing to share blessings will bring happiness and strengthen friendships.`
    },
    {
      title: (n, h, t, b, s, hl) => `${n}'s Bamboo Savings Jar`,
      rumusan: (n, h, t, b, s, hl) => `This educational story follows ${n} as he learns about money management. He uses a handmade bamboo jar to save money to buy a ${b} he wants.`,
      lesson: (n, h, t, b, s, sn) => `Saving money from a young age helps us develop independence and understand the true value of goods.`
    },
    {
      title: (n, h, t, b, s, hl) => `The Bravery of a Tiny ${capitalizeWords(h)}`,
      rumusan: (n, h, t, b, s, hl) => `Tells the story of a very tiny ${h} who has a big heart. He saves his friends in ${t} from a large predator by using his clever wits instead of strength.`,
      lesson: (n, h, t, b, s, sn) => `Clever thinking and timely courage are far more effective than mere physical strength.`
    },
    {
      title: (n, h, t, b, s, hl) => `A Special Gift for ${n}`,
      rumusan: (n, h, t, b, s, hl) => `Focuses on ${n}, who receives a special ${b} from his grandfather. The gift is not just a toy, but contains a handwritten letter with valuable life advice.`,
      lesson: (n, h, t, b, s, sn) => `We must cherish every gift we receive, especially the wisdom and advice passed down by elders.`
    },
    {
      title: (n, h, t, b, s, hl) => `The ${capitalizeWords(h)} Guarding ${t}`,
      rumusan: (n, h, t, b, s, hl) => `A little ${h} is sad to see the beautiful ${t} filled with plastic waste. He organizes a big cleanup campaign with all the forest animals to restore nature.`,
      lesson: (n, h, t, b, s, sn) => `Taking care of the environment and reducing waste is a shared duty to protect our health.`
    },
    {
      title: (n, h, t, b, s, hl) => `The School Talent Show at ${t}`,
      rumusan: (n, h, t, b, s, hl) => `${n} signs up for a creative talent competition at ${t}. Although he struggles at first, he keeps practicing diligently until he wins a special prize.`,
      lesson: (n, h, t, b, s, sn) => `Success is built on high determination, regular practice, and refusing to give up easily.`
    },
    {
      title: (n, h, t, b, s, hl) => `Being Honest Pays Off for ${n}`,
      rumusan: (n, h, t, b, s, hl) => `During school hours, ${n} accidentally breaks a ${b} belonging to his classmate. Despite being scared, he decides to tell the truth and apologize.`,
      lesson: (n, h, t, b, s, sn) => `Honesty and admitting mistakes build deep trust and respect in any friendship.`
    },
    {
      title: (n, h, t, b, s, hl) => `${n}'s Vacation in the Countryside`,
      rumusan: (n, h, t, b, s, hl) => `Follows ${n} as he spends his school holidays at his grandparents' cozy house in ${t}. He learns about herbal plants and local community values.`,
      lesson: (n, h, t, b, s, sn) => `Valuing family traditions and spending time with grandparents strengthens our family bonds.`
    },
    {
      title: (n, h, t, b, s, hl) => `The Proud ${capitalizeWords(h)} and the Patient ${capitalizeWords(hl)}`,
      rumusan: (n, h, t, b, s, hl) => `A very proud ${h} challenges a patient ${hl} to a race in the ${t}. Because of his arrogance, he makes mistakes and loses to the steady competitor.`,
      lesson: (n, h, t, b, s, sn) => `Arrogance leads to failure, while humility, patience, and steady focus lead to success.`
    },
    {
      title: (n, h, t, b, s, hl) => `The Mystery of the Missing Notebook`,
      rumusan: (n, h, t, b, s, hl) => `${n}'s favorite school notebook goes missing right before class. He and his friends search the school yard and find it with a funny, unexpected twist.`,
      lesson: (n, h, t, b, s, sn) => `Working together as a team helps solve problems faster and makes the process enjoyable.`
    },
    {
      title: (n, h, t, b, s, hl) => `The Active and Healthy Little ${capitalizeWords(h)}`,
      rumusan: (n, h, t, b, s, hl) => `This book features an active ${h} who does morning exercises daily in the ${t}. He encourages his lazy friends to join him to stay healthy.`,
      lesson: (n, h, t, b, s, sn) => `Exercising regularly and eating healthy foods are key factors for a long and energetic life.`
    },
    {
      title: (n, h, t, b, s, hl) => `A New Friend from ${t}`,
      rumusan: (n, h, t, b, s, hl) => `Tells the story of a new student who moves to the school from ${t}. ${n} welcomes him warmly and helps him find his way around the classroom.`,
      lesson: (n, h, t, b, s, sn) => `Being friendly and welcoming to newcomers creates a harmonious and inclusive environment.`
    },
    {
      title: (n, h, t, b, s, hl) => `${n}'s Creative Workshop`,
      rumusan: (n, h, t, b, s, hl) => `${n} is a creative kid who loves to repair broken ${b} instead of throwing them away. He repurposes old items to save money for his family.`,
      lesson: (n, h, t, b, s, sn) => `Creativity and recycling help reduce waste and teach us the value of resourcefulness.`
    }
  ];

  const enNonFictionTemplates = [
    {
      title: (t) => `Let's Explore the World of ${capitalizeWords(t)}`,
      rumusan: (t) => `This science book introduces children to the basics of ${t} with simple English sentences and colorful illustrations. It includes easy home experiments for young students.`,
      lesson: "Inspires young minds to love science and fosters curiosity about the natural world around us."
    },
    {
      title: (t) => `The Crucial Role of ${capitalizeWords(t)} in Our Lives`,
      rumusan: (t) => `Discusses why ${t} is vital for human survival, animal life, and the planet's ecosystem, highlighting modern methods for its conservation.`,
      lesson: "Teaches us to appreciate our natural resources and practice sustainable habits in our daily lives."
    },
    {
      title: (t) => `A Child's Practical Guide to ${capitalizeWords(t)}`,
      rumusan: (t) => `A practical guide explaining the core concepts of ${t} in a clear way, providing easy tips for kids to practice at school or home.`,
      lesson: "Encourages children to make healthy, rational, and responsible choices in their daily routine."
    },
    {
      title: (t) => `Fun Facts and Wonders of ${capitalizeWords(t)}`,
      rumusan: (t) => `Packed with amazing details, scientific facts, and unique questions about ${t} to inspire children's reading interests.`,
      lesson: "Fosters curiosity and promotes a healthy reading habit for continuous lifelong learning."
    },
    {
      title: (t) => `How We Can Preserve the Future of ${capitalizeWords(t)}`,
      rumusan: (t) => `Explores the scientific methods and practical steps needed to protect ${t} for current and future generations.`,
      lesson: "Taking care of the environment is a shared responsibility, and we should start with small steps."
    },
    {
      title: (t) => `An Introduction to the Science of ${capitalizeWords(t)}`,
      rumusan: (t) => `A beginner's reference book that explains the basic scientific concept of ${t} using clear diagrams and definitions.`,
      lesson: "Learning science helps to expand our minds and understand how the natural world operates."
    },
    {
      title: (t) => `The Secrets of ${capitalizeWords(t)} and Ecosystems`,
      rumusan: (t) => `Reveals the science and unique role of ${t} in maintaining the balance of the global ecosystem and biological diversity.`,
      lesson: "Every element of nature has its own special purpose and value in the chain of life."
    },
    {
      title: (t) => `Science and Technology Behind ${capitalizeWords(t)}`,
      rumusan: (t) => `Explains simple physics and modern technology behind the development and usage of ${t} in human civilization.`,
      lesson: "Science and technology help us solve complex human problems with rational and objective reasoning."
    },
    {
      title: (t) => `Exploring the Beauty of ${capitalizeWords(t)}`,
      rumusan: (t) => `Takes young readers on a visual journey to discover the beauty, shapes, and colorful variety of ${t} around the globe.`,
      lesson: "Developing a sense of wonder and observation is key to academic success and self-development."
    },
    {
      title: (t) => `Biodiversity and Saving Our ${capitalizeWords(t)}`,
      rumusan: (t) => `Highlights the diverse species and ecological value found in ${t} through maps, simple text, and clear photos.`,
      lesson: "The beauty and balance of our environment must be protected and valued by all citizens."
    }
  ];

  const zhFictionTemplates = [
    {
      title: (n, h, t, b, s, hl) => `${s}${h}的故事`,
      rumusan: (n, h, t, b, s, hl) => `本书讲述了一只生活在${t}里的可爱${h}的故事。它非常${s}，在林中空地捡到了一个精美的${b}后，主动克服了私心，千方百计寻找失主并归还。`,
      lesson: (n, h, t, b, s, sn) => `我们在生活中应当始终坚持${sn}的品质，做个诚实守信、令人信赖的好孩子。`
    },
    {
      title: (n, h, t, b, s, hl) => `${n}和神奇的${b}`,
      rumusan: (n, h, t, b, s, hl) => `讲述了男孩${n}在${t}探险时，意外获得了一个具有神奇功能的${b}。魔法虽然帮他省了很多力气，但最后他发现，靠自己努力完成任务才最踏实。`,
      lesson: (n, h, t, b, s, sn) => `我们不能依赖虚幻的捷径，只有脚踏实地依靠自身汗水换来的成果才最真实。`
    },
    {
      title: (n, h, t, b, s, hl) => `小${h}在${t}的奇遇记`,
      rumusan: (n, h, t, b, s, hl) => `活泼好动的小${h}独自前往${t}旅行，一路上遇到了许多新奇的事物。在面临暴风雨威胁时，它带领森林里的小动物们共同协作，成功加固了家园。`,
      lesson: (n, h, t, b, s, sn) => `团结协作是克服困难的法宝，与朋友分工合作能让难题迎刃而解。`
    },
    {
      title: (n, h, t, b, s, hl) => `${n}的新${b}梦`,
      rumusan: (n, h, t, b, s, hl) => `学校马上要开学了，${n}非常渴望拥有一个精美的${b}。为了减轻父母的负担，他在家长的建议下通过做家务和节省零花钱，用自己的积蓄买下了它。`,
      lesson: (n, h, t, b, s, sn) => `树立理财意识，通过勤劳和耐心实现自己的小目标，是成长的重要一课。`
    },
    {
      title: (n, h, t, b, s, hl) => `寻找真正朋友的小${h}`,
      rumusan: (n, h, t, b, s, hl) => `孤单的小${h}为了寻找真心朋友，决定去外面的${t}看一看。在旅途中，它渐渐学会了微笑、倾听以及礼貌待人的方法，终于收获了珍贵的友谊。`,
      lesson: (n, h, t, b, s, sn) => `真诚的微笑和礼貌的言行是人与人之间沟通的桥梁，也是赢得友谊的基础。`
    },
    {
      title: (n, h, t, b, s, hl) => `${t}的神秘地道`,
      rumusan: (n, h, t, b, s, hl) => `${n}和几个好朋友在${t}附近玩耍时，意外发现了一个被树叶遮挡的旧地道。他们分工合作，解开了一个个谜题，发现了一段关于这个小镇的历史故事。`,
      lesson: (n, h, t, b, s, sn) => `保持健康的好奇心和团队协作精神，能让我们在探索中增长见识、收获快乐。`
    },
    {
      title: (n, h, t, b, s, hl) => `热心肠的${n}`,
      rumusan: (n, h, t, b, s, hl) => `描写了懂事孩子${n}忙碌而有意义的一天。他放学后主动帮妈妈扫地、洗菜，还顺路帮住在${t}的王奶奶把报纸送上楼。`,
      lesson: (n, h, t, b, s, sn) => `百善孝为先，多为父母分担家务、积极帮助邻里，能让我们的社会更加温暖。`
    },
    {
      title: (n, h, t, b, s, hl) => `小${h}学会了分享`,
      rumusan: (n, h, t, b, s, hl) => `小${h}平时总是把好吃的好玩的藏起来，不愿意分享给${t}的小伙伴。直到有一回它的零食被大风卷走，伙伴们却纷纷伸出援手，它才明白了分享的道理。`,
      lesson: (n, h, t, b, s, sn) => `分享不会让我们的快乐减少，反而会让快乐加倍，能让我们收获更多的温暖。`
    },
    {
      title: (n, h, t, b, s, hl) => `${n}的小存钱罐`,
      rumusan: (n, h, t, b, s, hl) => `这本书讲述了${n}如何建立储蓄习惯的故事。他每天把没花完的零钱投进存钱罐里，最终成功用这笔钱买下了心仪已久的${b}，体会到了储蓄的乐趣。`,
      lesson: (n, h, t, b, s, sn) => `积少成多，培养勤俭节约、合理消费的习惯对我们的一生都大有裨益。`
    },
    {
      title: (n, h, t, b, s, hl) => `勇敢的矮个子小${h}`,
      rumusan: (n, h, t, b, s, hl) => `讲述了一只身材娇小的小${h}在${t}里智斗大灰狼的故事。它虽然力气很小，但遇到危险时冷静沉着，利用地形和机关巧妙地保护了大家。`,
      lesson: (n, h, t, b, s, sn) => `遇到危险时慌张没有用，要学会用智慧保护自己，冷静观察周围的环境。`
    },
    {
      title: (n, h, t, b, s, hl) => `爷爷的特别礼物`,
      rumusan: (n, h, t, b, s, hl) => `外公在生日那天送给${n}一个看起来有些旧的${b}，里面还夹着一封信。信中外公写下了许多关于诚实与勤奋的人生寄语，成为了${n}最宝贵的财富。`,
      lesson: (n, h, t, b, s, sn) => `比起物质财富，长辈留给我们的宝贵建议和家风美德更值得我们用心珍藏。`
    },
    {
      title: (n, h, t, b, s, hl) => `小${h}清理大森林`,
      rumusan: (n, h, t, b, s, hl) => `小${h}看到美丽的${t}里被丢弃了许多饮料瓶和垃圾，非常心疼。它主动拿来小垃圾袋，带领森林学校的同学们利用周末开展了一次清洁大行动。`,
      lesson: (n, h, t, b, s, sn) => `爱护环境、人人有责，文明习惯要从我做起，从小事做起，共同呵护美丽家园。`
    },
    {
      title: (n, h, t, b, s, hl) => `学校的绘画大赛`,
      rumusan: (n, h, t, b, s, hl) => `学校举办了主题为“我眼中的${t}”的绘画比赛，${n}认真准备，用七彩画笔描绘了心中的家园。虽然只拿到了优秀奖，但他依然感到非常自豪。`,
      lesson: (n, h, t, b, s, sn) => `重在参与，结果并不是最重要的，只要在努力的过程中有所进步就是成功。`
    },
    {
      title: (n, h, t, b, s, hl) => `小诚实的代价`,
      rumusan: (n, h, t, b, s, hl) => `在学校里，${n}不小心碰倒并摔坏了同学的${b}。他没有假装不知道，而是勇敢地走到老师和同学面前承认了错误，并用自己的零花钱重新买了一个赔给同学。`,
      lesson: (n, h, t, b, s, sn) => `诚实是立身之本，做错事要敢于承担后果，勇于纠正错误才能赢得尊重。`
    },
    {
      title: (n, h, t, b, s, hl) => `${n}去乡下外婆家`,
      rumusan: (n, h, t, b, s, hl) => `放暑假了，${n}乘车回到了位于${t}的外公外婆家。在那里他跟着长辈认识了各种各样的农作物，体验到了劳动的辛苦与大自然的丰富回馈。`,
      lesson: (n, h, t, b, s, sn) => `体验乡村生活能让我们更加珍惜盘中餐，同时要多陪伴长辈，孝敬老人。`
    },
    {
      title: (n, h, t, b, s, hl) => `骄傲的小${h}和耐心的${hl}`,
      rumusan: (n, h, t, b, s, hl) => `森林学校里骄傲的小${h}总觉得自己是跑得最快的。在一次障碍越野赛中，它因为骄傲大意而迷了路，而踏实稳重的小${hl}则一步一个脚印，最终赢得了比赛。`,
      lesson: (n, h, t, b, s, sn) => `骄傲使人落后，谦虚使人进步。做任何事情都要有恒心和耐心，切忌浮躁。`
    },
    {
      title: (n, h, t, b, s, hl) => `寻找丢失的数学作业本`,
      rumusan: (n, h, t, b, s, hl) => `第一节课铃声快响了，${n}却怎么也找不到数学本。在几个热心同桌的帮助下，大家顺着上学路上的线索，终于在学校长椅下找回了本子，过程既紧张又有趣。`,
      lesson: (n, h, t, b, s, sn) => `面对突发问题时不要慌张，团结同学、互相协助是高效解决问题的最好办法。`
    },
    {
      title: (n, h, t, b, s, hl) => `爱运动的小${h}`,
      rumusan: (n, h, t, b, s, hl) => `这本故事画册介绍了一只每天清晨在${t}里坚持慢跑的小${h}的故事。它不仅自己锻炼，还劝说那些整天睡懒觉的小胖猪一起运动，帮助大家保持身材。`,
      lesson: (n, h, t, b, s, sn) => `生命在于运动，坚持体育锻炼不仅能让我们身体健康，还能让我们每天精神饱满。`
    },
    {
      title: (n, h, t, b, s, hl) => `欢迎新同学`,
      rumusan: (n, h, t, b, s, hl) => `班里转来了一位从${t}来的新同学。${n}主动当起了“向导”，带新同学熟悉校园环境，介绍学校的各项活动，帮助新同学很快地融入了新集体。`,
      lesson: (n, h, t, b, s, sn) => `我们要用热情和善意去对待新朋友，主动帮助他人，营造团结有爱的集体氛围。`
    },
    {
      title: (n, h, t, b, s, hl) => `${n}的旧物变身记`,
      rumusan: (n, h, t, b, s, hl) => `${n}是一个手巧且有创意的孩子，他把废弃的${b}改造成了精美的收纳盒和花盆。不仅美化了房间，还起到了废物利用的环保效果。`,
      lesson: (n, h, t, b, s, sn) => `动脑筋进行旧物改造，可以减少环境垃圾，也能培养我们的动手实践能力。`
    }
  ];

  const zhNonFictionTemplates = [
    {
      title: (t) => `带孩子认识${t}`,
      rumusan: (t) => `本书通过通俗易懂的儿童语言和丰富的全彩插图，向小学生系统介绍了有关${t}的基础自然科学知识，并附有简单有趣的课堂互动问答。`,
      lesson: "激发孩子们对自然科学的探索欲，帮助建立探索未知科学领域的好奇心。"
    },
    {
      title: (t) => `${t}在人类生活中的重要角色`,
      rumusan: (t) => `深度探讨了${t}在人类日常生活、生态平衡以及环境保护中的重要地位，结合社会实践探讨了现代科学保护手段。`,
      lesson: "引导我们珍惜身边的每一份自然资源，增强对生态环境的主动保护意识。"
    },
    {
      title: (t) => `给小学生的${t}科普指南`,
      rumusan: (t) => `一本专为少年儿童量身打造的实用科普手册，梳理了关于${t}的知识要点，提供了便于在日常生活中实践的环保小建议。`,
      lesson: "指导孩子们在日常作息中做出更有利于身心健康和保护地球环境的明智选择。"
    },
    {
      title: (t) => `关于${t}的有趣奇闻与发现`,
      rumusan: (t) => `汇编了人类关于${t}的许多前沿科学发现和趣味历史事实，让科学知识不再枯燥，充满阅读乐趣。`,
      lesson: "培养孩子多读书、善于思考的好习惯，学会在生活中寻找科学常识。"
    },
    {
      title: (t) => `如何科学保护我们的${t}`,
      rumusan: (t) => `为孩子们提供了浅显易懂的科学建议与行动方案，阐明了在应对气候变暖时，我们应当如何合理保护${t}。`,
      lesson: "环境保护是全人类的共同事业，每一个微小的环保行动都具有重要意义。"
    },
    {
      title: (t) => `初探${t}：给小读者的第一本书`,
      rumusan: (t) => `本参考书为低年级学生设计，以简练直观的图表和文字，深入浅出地讲解了${t}这一科普课题的发展历程。`,
      lesson: "学无止境，从基础的科学概念开始，有助于为未来的理科学习打下坚实根基。"
    },
    {
      title: (t) => `${t}与地球生态平衡的奥秘`,
      rumusan: (t) => `揭示了${t}在自然循环和地球生态系统中发挥的巨大核心作用，让孩子明白万物相连的科学道理。`,
      lesson: "大自然中各种资源和生物相互依存，我们必须遵循自然规律，与之和谐相处。"
    },
    {
      title: (t) => `${t}背后的科学基础与现代应用`,
      rumusan: (t) => `介绍物理、化学等基础学科在解释${t}现象时的应用，帮助孩子把课本上的科学知识与实际生活联系起来。`,
      lesson: "科学是一把神奇的钥匙，能够帮助我们用客观、逻辑的态度来理解世界运行的法则。"
    },
    {
      title: (t) => `漫步地球：探索${t}的极致之美`,
      rumusan: (t) => `通过许多精美的航拍照片 and 地理知识，带领孩子们从视觉上领略地球上不同地区${t}的壮丽与奇妙。`,
      lesson: "读万卷书行万里路，时刻对世界保持求知热情，是快乐成长的源动力。"
    },
    {
      title: (t) => `物种多样性与珍稀的${t}`,
      rumusan: (t) => `利用清晰的数据图表、趣味手绘插画，生动展示了与${t}相关的生物群落及它们的生存现状。`,
      lesson: "地球是所有生物的共同家园，关爱动物植物，就是关爱人类自己。"
    }
  ];

  // Prime-sized arrays to guarantee mathematical uniqueness (Cycle: 19 * 17 * 13 * 11 * 7 = 323,323)
  const authors = ["Noraini Ahmad", "Siti Hajar", "Zalina Hassan", "Aina Farhana", "Nur Hafizah", "Siti Maisarah", "Zulhilmi Ahmad", "Dr. Farid Omar", "Rohana Ali", "Nadia Rahim", "Azman Yusof", "Ahmad Faisal", "Khairul Anuar", "Fatimah Zahra", "Mohd Syamil", "Rosli Harun", "Faridah Ismail", "Hazim Shah", "Aishah Rahman"]; // 19
  const publishers = ["Penerbitan Pelangi Sdn. Bhd.", "Pustaka Sri Dunia", "Sasbadi Sdn. Bhd.", "Cerdik Publications", "Dewan Bahasa dan Pustaka", "Penerbitan Fajar Bakti", "PTS Publishing House", "Pustaka Bestari", "Penerbitan Ilmu Bakti", "Karya Bestari", "Gemilang Press"]; // 11

  const bmNama = ["Ali", "Siti", "Aman", "Mimi", "Raju", "Mei Mei", "Zaki", "Hafiz", "Sarah", "Daniel", "Sofea", "Adam", "Fatimah", "Aina", "Aiman", "Chong", "Suresh", "Bella", "Haziq"]; // 19
  const bmHaiwan = ["arnab", "kucing", "burung", "tupai", "kura-kura", "monyet", "anak ayam", "singa", "gajah", "semut", "belalang", "kancil", "anjing", "itik", "katak", "kambing", "lembu"]; // 17
  const bmTempat = ["Hutan Hijau", "Kampung Damai", "Pulau Indah", "Taman Bunga", "Sekolah Impian", "Bukit Ceria", "Kampung Sentosa", "Tasik Indah", "Lembah Gemilang", "Taman Harmony", "Pantai Murni", "Bandar Sinar", "Teluk Bayu"]; // 13
  const bmBenda = ["kotak kayu", "beg sekolah", "pensel warna", "basikal lama", "layang-layang", "bola sepak", "cermin antik", "kunci emas", "jam dinding", "topi jerami", "payung merah"]; // 11
  const bmSifat = ["jujur", "berani", "rajin", "bijak", "baik hati", "sabar", "pemurah"]; // 7
  const bmSifatNoun = { "jujur": "kejujuran", "berani": "keberanian", "rajin": "kerajinan", "bijak": "kebijaksanaan", "baik hati": "kebaikan hati", "sabar": "kesabaran", "pemurah": "sifat pemurah" };
  const bmTopics = ["cuaca", "sistem air", "hujan", "matahari", "bulan", "bintang", "planet", "awan", "angin", "tanah", "batu", "pasir", "lautan", "sungai", "tasik", "kolam", "hutan", "gunung", "lembah", "padang pasir", "haiwan peliharaan", "haiwan liar", "burung", "ikan", "serangga", "reptilia", "mamalia", "tumbuhan", "bunga", "buah-buahan", "sayur-sayuran", "pokok", "daun", "akar", "kitar semula", "sampah", "plastik", "kertas", "kaca", "logam", "kesihatan", "kebersihan", "gigi", "mata", "telinga", "kulit", "rambut", "jantung", "paru-paru", "otak", "tulang", "otot", "makanan", "minuman", "susu", "roti", "nasi", "buah", "sayur", "daging", "sukan", "bola sepak", "badminton", "berenang", "berlari", "berbasikal", "sejarah", "budaya", "muzik", "lukisan", "tarian", "permainan tradisi", "sains", "matematik", "teknologi", "komputer", "internet", "angkasa", "tenaga", "elektrik", "magnet", "cahaya", "bunyi", "haba", "graviti", "air bersih", "udara bersih", "kebun sayur", "peternakan", "perikanan", "pertanian", "pengangkutan", "kereta", "keretapi", "kapal terbang", "kapal laut", "keselamatan", "kebakaran", "pertolongan cemas", "adab sopan"]; // 97 (prime)

  const enAuthors = ["Emily Carter", "Sarah Collins", "Anna Brooks", "Michael Reed", "Helen Ward", "Peter Grant", "Laura Hill", "Rachel Green", "John Smith", "Mary Johnson", "David Brown", "James Wilson", "Robert Taylor", "Linda Thomas", "Elizabeth White", "William Harris", "Barbara Martin", "Richard Thompson", "Susan Garcia"]; // 19
  const enPublishers = publishers;
  const enNames = ["Oliver", "Emma", "Jack", "Lily", "Leo", "Anna", "Ryan", "Lucy", "Toby", "Sophie", "Max", "Mia", "Zac", "Grace", "Lucas", "Ella", "Ben", "Chloe", "Sam"]; // 19
  const enAnimals = ["rabbit", "kitten", "puppy", "squirrel", "turtle", "monkey", "chick", "lion", "elephant", "ant", "bee", "frog", "duck", "lamb", "bear", "fox", "deer"]; // 17
  const enPlaces = ["Green Forest", "Peaceful Valley", "Sunny Meadow", "Happy Garden", "Dream School", "Sunny Hill", "Cozy Town", "Crystal Lake", "Golden Valley", "Rainbow Creek", "Windy Ridge", "Bright Shore", "Silent Peak"]; // 13
  const enObjects = ["wooden box", "school bag", "colored pencil", "old bicycle", "colorful kite", "soccer ball", "antique mirror", "golden key", "wall clock", "straw hat", "red umbrella"]; // 11
  const enAdjectives = ["honest", "brave", "hardworking", "clever", "kind", "patient", "generous"]; // 7
  const enAdjectiveNouns = { "honest": "honesty", "brave": "bravery", "hardworking": "hard work", "clever": "cleverness", "kind": "kindness", "patient": "patience", "generous": "generosity" };
  const enTopics = ["weather", "water systems", "rain", "the sun", "the moon", "stars", "planets", "clouds", "wind", "soil", "rocks", "sand", "oceans", "rivers", "lakes", "ponds", "forests", "mountains", "valleys", "deserts", "pets", "wildlife", "birds", "fish", "insects", "reptiles", "mammals", "plants", "flowers", "fruits", "vegetables", "trees", "leaves", "roots", "recycling", "waste", "plastics", "paper", "glass", "metals", "health", "hygiene", "teeth", "eyes", "ears", "skin", "hair", "the heart", "lungs", "the brain", "bones", "muscles", "food", "drinks", "milk", "bread", "rice", "fruits", "vegetables", "meat", "sports", "football", "badminton", "swimming", "running", "cycling", "history", "culture", "music", "art", "dance", "traditional games", "science", "mathematics", "technology", "computers", "the internet", "outer space", "energy", "electricity", "magnets", "light", "sound", "heat", "gravity", "clean water", "clean air", "vegetable gardens", "farming", "fishing", "agriculture", "transportation", "cars", "trains", "airplanes", "ships", "safety", "fire safety", "first aid", "good manners"]; // 97 (prime)

  const zhAuthors = ["林小慧", "陈美玲", "王丽萍", "李安琪", "周明华", "黄佳怡", "刘文杰", "张雅雯", "赵强", "吴明", "孙丽", "周洁", "王伟", "李军", "刘洋", "张平", "李娜", "王静", "陈浩"]; // 19
  const zhPublishers = ["明天出版社", "二十一世纪出版社", "长江少年儿童出版社", "安徽少年儿童出版社", "浙江少年儿童出版社", "江苏凤凰少年儿童出版社", "接力出版社", "四川少年儿童出版社", "湖南少年儿童出版社", "北京少年儿童出版社", "启发文化"]; // 11
  const zhNames = ["小明", "美美", "阿豪", "丽丽", "小华", "欢欢", "乐乐", "天天", "小东", "红红", "强强", "亮亮", "小芳", "兰兰", "佳佳", "宇宇", "洋洋", "晨晨", "欣欣"]; // 19
  const zhAnimals = ["小兔子", "小猫", "小狗", "小松鼠", "小乌龟", "小猴子", "小鸡", "大狮子", "小象", "小蚂蚁", "小蜜蜂", "小青蛙", "小鸭子", "小绵羊", "小熊", "小狐狸", "小鹿"]; // 17
  const zhPlaces = ["青青森林", "幸福小镇", "快乐学校", "美丽花园", "太阳山谷", "彩虹草地", "水晶湖畔", "阳光山丘", "金色小溪", "和谐社区", "微风山脊", "明亮沙滩", "寂静高峰"]; // 13
  const zhObjects = ["红雨伞", "魔法盒", "新书包", "大自行车", "彩虹风筝", "足球", "古董镜子", "金色钥匙", "大闹钟", "小草帽", "红雨伞"]; // 11
  const zhAdjectives = ["诚实的", "勇敢的", "勤劳的", "聪明的", "善良的", "有耐心的", "大方的"]; // 7
  const zhAdjectiveNouns = { "诚实的": "诚实", "勇敢的": "勇气", "勤劳的": "勤劳", "聪明的": "智慧", "善良的": "善良", "有耐心的": "耐心", "大方的": "慷慨" };
  const zhTopics = ["天气变化", "水资源系统", "降雨现象", "太阳的奥秘", "月球探索", "闪烁的星星", "八大行星", "云朵的形成", "风的力量", "泥土与植物", "岩石与矿物", "沙子的故事", "辽阔的海洋", "奔流的河流", "美丽的湖泊", "小池塘生态", "森林生态系统", "雄伟的山脉", "神秘的山谷", "荒凉的沙漠", "可爱的小宠物", "野生动物世界", "天空中的鸟类", "水中的鱼类", "神奇的昆虫", "爬行动物科普", "哺乳动物特征", "绿色植物生长", "美丽的花朵", "水果的生长", "蔬菜的营养", "高大的树木", "树叶的光合作用", "植物的根部", "垃圾分类知识", "生活垃圾处理", "塑料制品的危害", "纸张回收利用", "玻璃制品工艺", "金属材料分类", "身体健康管理", "个人卫生习惯", "牙齿保健常识", "眼睛保护指南", "耳朵的奥秘", "皮肤的防护", "头发的清洁", "神奇的心脏", "肺部呼吸原理", "大脑发育过程", "骨骼与关节", "肌肉的力量", "日常食物分类", "干净的饮用水", "牛奶的营养价值", "面包的制作过程", "稻谷与米饭", "美味的水果", "绿色蔬菜", "肉类食品安全", "体育运动常识", "足球运动魅力", "羽毛球运动技巧", "游泳的乐趣", "跑步锻炼方法", "骑自行车的安全", "历史故事人物", "中华传统文化", "优美的音乐旋律", "美术绘画基础", "少儿舞蹈艺术", "民间传统游戏", "奇妙的物理现象", "数学基础运算", "现代科技应用", "电脑的日常用途", "互联网的世界", "神秘的太空探索", "自然资源能源", "电的产生原理", "磁铁的吸引力", "光线的传播路径", "声音是怎样产生的", "热能转换常识", "万有引力概念", "干净的饮用水源", "新鲜的空气质量", "家庭绿色菜园", "畜牧养殖科学", "淡水养鱼技术", "现代生态农业", "交通工具演变", "汽车的发展史", "火车的旅行", "飞机的飞行原理", "轮船航行奥秘", "居家安全防范", "防范火灾知识", "急救基础小知识", "日常礼仪规范"]; // 97 (prime)

  // Local State
  const state = {
    profile: "default",
    currentSession: "",
    currentBook: 0,
    dailyTarget: 50,
    langCounters: { bm: 0, en: 0, zh: 0 },
    filters: {
      category: "all",
      language: "bm"
    },
    ...GM_getValue(STORE_KEY, {})
  };

  let tokenIntercepted = "";
  let userMeId = null;
  let lastRatingBtnClickTime = 0;

  // Intercept credentials and email
  function hookFetch() {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      let urlStr = "";
      let headers = {};

      try {
        const url = args[0];
        const options = args[1] || {};

        if (url instanceof Request) {
          urlStr = url.url;
          url.headers.forEach((value, key) => {
            headers[key.toLowerCase()] = value;
          });
        } else {
          urlStr = String(url);
          if (options.headers) {
            if (options.headers instanceof Headers) {
              options.headers.forEach((value, key) => {
                headers[key.toLowerCase()] = value;
              });
            } else if (typeof options.headers === "object") {
              Object.keys(options.headers).forEach(key => {
                headers[key.toLowerCase()] = String(options.headers[key]);
              });
            }
          }
        }

        const auth = headers["authorization"];
        if (auth && auth.startsWith("Bearer ")) {
          tokenIntercepted = auth;
          try {
            const payload = JSON.parse(atob(auth.split(".")[1]));
            userMeId = payload.id;
          } catch (e) {
            console.error("NILAM Assistant: Failed to parse JWT token", e);
          }
        }
      } catch (e) {
        console.error("NILAM Assistant: hookFetch header parse error", e);
      }

      const response = await originalFetch.apply(this, args);

      try {
        if (urlStr.includes("/api/users/me")) {
          const clone = response.clone();
          const userObj = await clone.json();
          const email = userObj.email;
          if (email && email !== state.profile) {
            console.log("NILAM Assistant: Auto-detected Profile Email:", email);
            state.profile = email;
            saveState();
            await fetchSessionState();
          }
        }
      } catch (e) {
        console.error("NILAM Assistant: Error reading users/me", e);
      }

      return response;
    };
  }

  // Persist local UI settings
  function saveState() {
    GM_setValue(STORE_KEY, {
      profile: state.profile,
      filters: state.filters
    });
  }

  // Communication with Cloudflare Worker
  async function fetchSessionState() {
    if (!state.profile || state.profile === "default") return;
    setStatus("Syncing with KV...");
    try {
      const res = await fetch(`${WORKER_URL}/session?profile=${encodeURIComponent(state.profile)}`);
      if (res.ok) {
        const cloudState = await res.json();
        state.currentSession = cloudState.currentSession;
        state.currentBook = cloudState.currentBook;
        state.dailyTarget = cloudState.dailyTarget;
        state.langCounters = cloudState.langCounters || { bm: 0, en: 0, zh: 0 };
        renderBook();
        updateUI();
        setStatus("Cloud Synced");
      }
    } catch (e) {
      console.error("NILAM Assistant: Cloud Sync Error", e);
      setStatus("Sync Failed");
    }
  }

  async function advanceCloudState(lang) {
    if (!state.profile || !state.currentSession) return;
    setStatus("Saving progress...");
    try {
      const res = await fetch(`${WORKER_URL}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: state.profile,
          lang: lang,
          session: state.currentSession
        })
      });
      if (res.ok) {
        const cloudState = await res.json();
        state.currentSession = cloudState.currentSession;
        state.currentBook = cloudState.currentBook;
        state.dailyTarget = cloudState.dailyTarget;
        state.langCounters = cloudState.langCounters || { bm: 0, en: 0, zh: 0 };
        saveState();
        renderBook();
        updateUI();
        setStatus("Cloud Progress +1");
      }
    } catch (e) {
      console.error("NILAM Assistant: Failed to advance progress on cloud", e);
      setStatus("Cloud Update Error");
    }
  }

  async function resetSessionCloud() {
    if (!state.profile) return;
    if (!confirm("Are you sure you want to reset and start a new session?")) return;
    setStatus("Resetting session...");
    try {
      const res = await fetch(`${WORKER_URL}/session/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: state.profile })
      });
      if (res.ok) {
        const cloudState = await res.json();
        state.currentSession = cloudState.currentSession;
        state.currentBook = cloudState.currentBook;
        state.dailyTarget = cloudState.dailyTarget;
        state.langCounters = cloudState.langCounters || { bm: 0, en: 0, zh: 0 };
        saveState();
        renderBook();
        updateUI();
        setStatus("New Session Started");
      }
    } catch (e) {
      console.error("NILAM Assistant: Failed to reset session on cloud", e);
      setStatus("Reset Error");
    }
  }

  // Cryptographic Deterministic Book Generator
  async function generateFieldSeed(fieldName, index) {
    const input = `${state.profile}-${state.currentSession}-${index}-${fieldName}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const num = (hashArray[0] << 24) | (hashArray[1] << 16) | (hashArray[2] << 8) | hashArray[3];
    return Math.abs(num);
  }

  function formatIsbn(isbn, language) {
    const compact = String(isbn ?? "").replaceAll("-", "");
    if (!/^978\d{10}$/.test(compact)) return String(isbn ?? "");
    if (compact.startsWith("978967")) return `${compact.slice(0, 3)}-${compact.slice(3, 6)}-${compact.slice(6, 9)}-${compact.slice(9, 12)}-${compact.slice(12)}`;
    if (compact.startsWith("9780")) return `${compact.slice(0, 3)}-${compact.slice(3, 4)}-${compact.slice(4, 7)}-${compact.slice(7, 12)}-${compact.slice(12)}`;
    if (compact.startsWith("9787")) return `${compact.slice(0, 3)}-${compact.slice(3, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}-${compact.slice(12)}`;
    return `${compact.slice(0, 3)}-${compact.slice(3, 6)}-${compact.slice(6, 9)}-${compact.slice(9, 12)}-${compact.slice(12)}`;
  }

  function isbn13(language, index) {
    const serial = String(index % 1000000).padStart(6, "0");
    const bodyByLanguage = {
      bm: `978967${serial}`,
      en: `9780241${serial.slice(1)}`,
      zh: `97875560${serial.slice(2)}`
    };
    const body = bodyByLanguage[language] || `978967${serial}`;
    const sum = [...body].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
    const isbn = `${body}${(10 - (sum % 10)) % 10}`;
    return formatIsbn(isbn, language);
  }

  function ensureMinWordCount(text, minWords, langCode) {
    let cleanText = String(text ?? "").trim();
    if (!cleanText) return "";

    let words = cleanText.split(/\s+/).filter(Boolean);
    if (langCode === "zh" || /[\u4e00-\u9fa5]/.test(cleanText)) {
      if (words.length < minWords) {
        cleanText = cleanText.replace(/([，。！？；：、])/g, "$1 ");
        words = cleanText.split(/\s+/).filter(Boolean);
      }
      if (words.length < minWords) {
        cleanText = cleanText.split("").filter(c => c.trim()).join(" ");
      }
      return cleanText;
    }

    if (words.length < minWords) {
      const fillers = {
        bm: {
          summary: "Buku ini sangat menarik dan sesuai dibaca oleh semua golongan pembaca.",
          lesson: "Amalan mulia ini sangat penting."
        },
        en: {
          summary: "This book is very interesting and highly recommended for all readers.",
          lesson: "This moral lesson is very important."
        }
      };
      const lang = langCode === "en" ? "en" : "bm";
      const filler = minWords >= 10 ? fillers[lang].summary : fillers[lang].lesson;
      cleanText = cleanText + " " + filler;
    }
    return cleanText;
  }

  async function generateBook(lang, categoryFilter, index) {
    // 1. Determine if Fiction or Non-Fiction
    let isFiction = true;
    if (categoryFilter === "Fiksyen") {
      isFiction = true;
    } else if (categoryFilter === "Bukan Fiksyen") {
      isFiction = false;
    } else {
      isFiction = ((await generateFieldSeed("category", index)) % 2) === 0;
    }

    const categoryText = isFiction ? "Fiksyen" : "Bukan Fiksyen";

    // Modulo offsets generated via unique seeds to avoid overlaps
    const authorSeed = await generateFieldSeed("author", index);
    const publisherSeed = await generateFieldSeed("publisher", index);
    const yearSeed = await generateFieldSeed("year", index);
    const pagesSeed = await generateFieldSeed("pages", index);

    const yearVal = 2016 + (yearSeed % 9);
    const pagesVal = 16 + (pagesSeed % 24);

    let title = "";
    let rumusan = "";
    let lesson = "";
    let author = "";
    let publisher = "";

    if (lang === "bm") {
      author = authors[authorSeed % authors.length];
      publisher = publishers[publisherSeed % publishers.length];

      if (isFiction) {
        const templateSeed = await generateFieldSeed("template", index);
        const template = bmFictionTemplates[templateSeed % bmFictionTemplates.length];

        const n = bmNama[(await generateFieldSeed("n", index)) % bmNama.length];
        const h = bmHaiwan[(await generateFieldSeed("h", index)) % bmHaiwan.length];
        const hl = bmHaiwan[(await generateFieldSeed("hl", index)) % bmHaiwan.length];
        const t = bmTempat[(await generateFieldSeed("t", index)) % bmTempat.length];
        const b = bmBenda[(await generateFieldSeed("b", index)) % bmBenda.length];
        const s = bmSifat[(await generateFieldSeed("s", index)) % bmSifat.length];
        const sn = bmSifatNoun[s] || s;

        title = template.title(n, h, t, b, s, hl);
        rumusan = template.rumusan(n, h, t, b, s, hl);
        lesson = template.lesson(n, h, t, b, s, sn);
      } else {
        const templateSeed = await generateFieldSeed("template", index);
        const template = bmNonFictionTemplates[templateSeed % bmNonFictionTemplates.length];
        const topic = bmTopics[(await generateFieldSeed("topic", index)) % bmTopics.length];

        title = template.title(topic);
        rumusan = template.rumusan(topic);
        lesson = template.lesson;
      }
    } else if (lang === "en") {
      author = enAuthors[authorSeed % enAuthors.length];
      publisher = publishers[publisherSeed % publishers.length];

      if (isFiction) {
        const templateSeed = await generateFieldSeed("template", index);
        const template = enFictionTemplates[templateSeed % enFictionTemplates.length];

        const n = enNames[(await generateFieldSeed("n", index)) % enNames.length];
        const h = enAnimals[(await generateFieldSeed("h", index)) % enAnimals.length];
        const hl = enAnimals[(await generateFieldSeed("hl", index)) % enAnimals.length];
        const t = enPlaces[(await generateFieldSeed("t", index)) % enPlaces.length];
        const b = enObjects[(await generateFieldSeed("b", index)) % enObjects.length];
        const s = enAdjectives[(await generateFieldSeed("s", index)) % enAdjectives.length];
        const sn = enAdjectiveNouns[s] || s;

        title = template.title(n, h, t, b, s, hl);
        rumusan = template.rumusan(n, h, t, b, s, hl);
        lesson = template.lesson(n, h, t, b, s, sn);
      } else {
        const templateSeed = await generateFieldSeed("template", index);
        const template = enNonFictionTemplates[templateSeed % enNonFictionTemplates.length];
        const topic = enTopics[(await generateFieldSeed("topic", index)) % enTopics.length];

        title = template.title(topic);
        rumusan = template.rumusan(topic);
        lesson = template.lesson;
      }
    } else { // "zh"
      author = zhAuthors[authorSeed % zhAuthors.length];
      publisher = zhPublishers[publisherSeed % zhPublishers.length];

      if (isFiction) {
        const templateSeed = await generateFieldSeed("template", index);
        const template = zhFictionTemplates[templateSeed % zhFictionTemplates.length];

        const n = zhNames[(await generateFieldSeed("n", index)) % zhNames.length];
        const h = zhAnimals[(await generateFieldSeed("h", index)) % zhAnimals.length];
        const hl = zhAnimals[(await generateFieldSeed("hl", index)) % zhAnimals.length];
        const t = zhPlaces[(await generateFieldSeed("t", index)) % zhPlaces.length];
        const b = zhObjects[(await generateFieldSeed("b", index)) % zhObjects.length];
        const s = zhAdjectives[(await generateFieldSeed("s", index)) % zhAdjectives.length];
        const sn = zhAdjectiveNouns[s] || s;

        title = template.title(n, h, t, b, s, hl);
        rumusan = template.rumusan(n, h, t, b, s, hl);
        lesson = template.lesson(n, h, t, b, s, sn);
      } else {
        const templateSeed = await generateFieldSeed("template", index);
        const template = zhNonFictionTemplates[templateSeed % zhNonFictionTemplates.length];
        const topic = zhTopics[(await generateFieldSeed("topic", index)) % zhTopics.length];

        title = template.title(topic);
        rumusan = template.rumusan(topic);
        lesson = template.lesson;
      }
    }

    const langLabel = lang === "bm" ? "Bahasa Melayu" : (lang === "en" ? "English" : "Lain-lain");

    return {
      date: getBookDate(),
      title,
      pages: pagesVal,
      isbn: isbn13(lang, index),
      author,
      publisher,
      year: yearVal,
      category: categoryText,
      language: langLabel,
      rumusan: ensureMinWordCount(rumusan, 10, lang),
      lesson: ensureMinWordCount(lesson, 5, lang)
    };
  }

  // Get date helper
  function todayIsoDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function getBookDate() {
    return localStorage.getItem("nilam_start_date") || todayIsoDate();
  }

  // Unique CSS Selector Generator for Calibration
  function getUniqueSelector(el) {
    if (!el) return "";
    if (el.id && !el.id.startsWith("nja-")) return `#${el.id}`;
    let path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.id && !el.id.startsWith("nja-")) {
        selector += `#${el.id}`;
        path.unshift(selector);
        break;
      } else {
        let sibling = el;
        let sibIndex = 1;
        while (sibling = sibling.previousElementSibling) {
          if (sibling.nodeName === el.nodeName) sibIndex++;
        }
        if (sibIndex > 1 || el.nextElementSibling) {
          selector += `:nth-of-type(${sibIndex})`;
        }
      }
      path.unshift(selector);
      el = el.parentNode;
    }
    return path.join(" > ");
  }

  // Element Calibration Functions
  let isCalibratingDate = false;
  let isCalibratingStar = false;

  function calibrateDate() {
    isCalibratingDate = true;
    isCalibratingStar = false;
    document.body.style.cursor = "crosshair";
    setStatus("Click target Date Input...");
    const btn = document.querySelector("#nja-calibrate-date");
    if (btn) btn.textContent = "Click Input...";

    const onDateClick = (e) => {
      if (isInsidePanel(e.target)) return;
      e.preventDefault();
      e.stopPropagation();

      const selector = getUniqueSelector(e.target);
      localStorage.setItem("nilam_date_selector", selector);
      console.log("NILAM Assistant: Calibrated Date Selector:", selector);

      isCalibratingDate = false;
      document.body.style.cursor = "default";
      if (btn) btn.textContent = "Calibrate Date";
      setStatus("Date Calibrated");
      document.removeEventListener("click", onDateClick, true);
    };

    document.addEventListener("click", onDateClick, true);
  }

  function calibrateStar() {
    isCalibratingStar = true;
    isCalibratingDate = false;
    document.body.style.cursor = "crosshair";
    setStatus("Click 5th Star...");
    const btn = document.querySelector("#nja-calibrate-star");
    if (btn) btn.textContent = "Click Star...";

    const onStarClick = (e) => {
      if (isInsidePanel(e.target)) return;
      e.preventDefault();
      e.stopPropagation();

      const selector = getUniqueSelector(e.target);
      localStorage.setItem("nilam_star_selector", selector);
      console.log("NILAM Assistant: Calibrated Star Selector:", selector);

      isCalibratingStar = false;
      document.body.style.cursor = "default";
      if (btn) btn.textContent = "Calibrate Star";
      setStatus("Star Calibrated");
      document.removeEventListener("click", onStarClick, true);
    };

    document.addEventListener("click", onStarClick, true);
  }

  // Form Auto-Fill DOM Helpers
  function setValue(el, value) {
    if (!el) return false;
    el.focus();

    const setter =
      Object.getOwnPropertyDescriptor(el.constructor.prototype, "value")?.set ||
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set ||
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;

    if (setter) setter.call(el, String(value ?? ""));
    else el.value = String(value ?? "");

    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: String(value ?? "") }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    el.blur();
    return true;
  }

  function isInsidePanel(el) {
    return el && el.closest("#nilam-json-assistant");
  }

  function isUsableElement(el) {
    if (!el || isInsidePanel(el)) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isElementVisible(el) {
    if (!el) return false;
    let cur = el;
    while (cur && cur !== document.body) {
      const style = window.getComputedStyle(cur);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
        return false;
      }
      cur = cur.parentElement;
    }
    const rect = el.getBoundingClientRect();
    const parentRect = el.parentElement ? el.parentElement.getBoundingClientRect() : null;
    const hasDimensions = (rect.width > 0 && rect.height > 0) || (parentRect && parentRect.width > 0 && parentRect.height > 0);
    return hasDimensions;
  }

  function findDateInput() {
    // 1. Try Calibrated Selector first
    const calSelector = localStorage.getItem("nilam_date_selector");
    if (calSelector) {
      const el = document.querySelector(calSelector);
      if (el) return el;
    }

    // 2. Traversal fallbacks
    const isFormElement = (el) => isUsableElement(el) && !isInsidePanel(el);

    const directSelectors = [
      'input[type="date"]',
      'input[id*="date" i]',
      'input[id*="tarikh" i]',
      'input[name*="date" i]',
      'input[name*="tarikh" i]',
      'input[placeholder*="date" i]',
      'input[placeholder*="tarikh" i]',
      'input[aria-label*="date" i]',
      'input[aria-label*="tarikh" i]'
    ];

    for (const selector of directSelectors) {
      const found = Array.from(document.querySelectorAll(selector)).find(isFormElement);
      if (found) return found;
    }

    const labels = Array.from(document.querySelectorAll("label")).filter((label) =>
      !isInsidePanel(label) && /tarikh|date/i.test(label.textContent || "")
    );
    for (const label of labels) {
      const input = label.control || label.querySelector("input");
      if (isFormElement(input)) return input;
    }

    const visibleInputs = Array.from(document.querySelectorAll("input")).filter(isFormElement);
    const titleIndex = visibleInputs.indexOf(document.getElementById("title"));
    if (titleIndex > 0) return visibleInputs[titleIndex - 1];

    const blockedIds = new Set(["title", "noOfPage", "isbn", "author", "publisher", "publishedYear",
      "nja-start-date", "nja-source", "nja-category", "nja-language"]);
    return visibleInputs
      .find((el) => {
        const type = String(el.type || "").toLowerCase();
        if (["hidden", "radio", "checkbox", "button", "submit"].includes(type)) return false;
        if (blockedIds.has(el.id)) return false;
        return /^\d{4}-\d{2}-\d{2}$|\d{1,2}\/\d{1,2}\/\d{4}/.test(el.value || el.placeholder || "");
      }) || null;
  }

  function dateValueForInput(el, isoDate) {
    if (String(el?.type || "").toLowerCase() === "date") return isoDate;
    const [, year, month, day] = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/) || [];
    if (!year) return isoDate;
    const hint = `${el.value || ""} ${el.placeholder || ""} ${el.getAttribute("aria-label") || ""}`;
    return hint.includes("/") ? `${day}/${month}/${year}` : isoDate;
  }

  function fillDate(book) {
    const dateInput = findDateInput();
    if (!dateInput) {
      console.log("NILAM Assistant: date input not found, retrying...");
      return false;
    }

    if (dateInput.hasAttribute("readonly")) dateInput.removeAttribute("readonly");
    if (dateInput.hasAttribute("disabled")) dateInput.removeAttribute("disabled");

    const dateValue = dateValueForInput(dateInput, book.date);

    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

    dateInput.focus();
    dateInput.click();

    if (nativeSetter) nativeSetter.call(dateInput, dateValue);
    else dateInput.value = dateValue;

    dateInput.dispatchEvent(new Event("input", { bubbles: true }));
    dateInput.dispatchEvent(new Event("change", { bubbles: true }));
    dateInput.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: dateValue }));

    ["keydown", "keypress", "keyup"].forEach((type) => {
      dateInput.dispatchEvent(new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        code: "Enter"
      }));
    });

    dateInput.dispatchEvent(new Event("blur", { bubbles: true }));

    // Confirm and retry
    setTimeout(() => {
      if (dateInput.value !== dateValue) {
        if (nativeSetter) nativeSetter.call(dateInput, dateValue);
        else dateInput.value = dateValue;
        dateInput.dispatchEvent(new Event("input", { bubbles: true }));
        dateInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, 200);

    return true;
  }

  function selectDropdownByText(selectIndex, targetText) {
    const allSelects = Array.from(document.querySelectorAll("select")).filter(el => !isInsidePanel(el));
    const selectEl = allSelects[selectIndex];
    if (!selectEl || !targetText) return false;

    const opt = Array.from(selectEl.options).find((option) =>
      option.textContent.trim().toLowerCase().includes(targetText.toLowerCase())
    );

    if (!opt) return false;

    selectEl.value = opt.value;
    selectEl.selectedIndex = opt.index;
    selectEl.dispatchEvent(new Event("input", { bubbles: true }));
    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function nearestClickable(el) {
    let current = el;
    for (let i = 0; current && i < 5; i += 1, current = current.parentElement) {
      if (current.matches?.('button, label, input, [role="radio"], [role="button"], [tabindex]')) return current;
    }
    return el;
  }

  function clickLikeUser(el) {
    if (!el) return false;
    const target = nearestClickable(el);
    target.scrollIntoView({ behavior: "auto", block: "center" });
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    if (target.tagName === "INPUT" && target.type === "radio") {
      target.checked = true;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    // Dispatch click events WITHOUT passing sandboxed view object
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
      target.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
      }));
    });
    target.click?.();
    return true;
  }

  function forceClickFifthStar() {
    // 1. Try calibrated star selector first
    const calSelector = localStorage.getItem("nilam_star_selector");
    if (calSelector) {
      const el = document.querySelector(calSelector);
      if (el) {
        clickLikeUser(el);
        setStatus("5 Star clicked");
        return true;
      }
    }

    // 2. Traversal selector (User Reference script style, optimized)
    const stars = Array.from(document.querySelectorAll("svg"))
      .filter(svg => !isInsidePanel(svg) && svg.outerHTML.includes("fa-star") && isElementVisible(svg));

    if (stars.length >= 5) {
      const fifthStar = stars[4];
      fifthStar.scrollIntoView({ behavior: "auto", block: "center" });

      ["mousedown", "mouseup", "click"].forEach(type => {
        fifthStar.dispatchEvent(new MouseEvent(type, {
          bubbles: true,
          cancelable: true
        }));
      });

      let parent = fifthStar.parentElement;
      for (let i = 0; parent && i < 3; i++, parent = parent.parentElement) {
        if (parent.matches('button, label, [role="button"], span, div')) {
          parent.click();
          break;
        }
      }

      console.log("⭐⭐⭐⭐⭐ Clicked 5th star SVG");
      setStatus("5 Star clicked");
      return true;
    }

    // 3. Fallbacks
    const fiveValue = Array.from(document.querySelectorAll('input[type="radio"]'))
      .filter(el => isUsableElement(el) && !isInsidePanel(el))
      .find((el) => /rating|star|rate|skor|bintang/i.test(`${el.name} ${el.id}`) && String(el.value) === "5");
    if (fiveValue && clickLikeUser(fiveValue)) {
      setStatus("5 Star clicked");
      return true;
    }

    const genericStars = Array.from(document.querySelectorAll('svg, [class*="star" i], [data-icon*="star" i]'))
      .filter((el) => !isInsidePanel(el) && isElementVisible(el) && /star|bintang/i.test(el.outerHTML || el.className || ""))
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return Math.abs(ar.top - br.top) > 8 ? ar.top - br.top : ar.left - br.left;
      });

    if (genericStars.length >= 5) {
      const target = genericStars[4];
      target.scrollIntoView({ behavior: "auto", block: "center" });
      ["mousedown", "mouseup", "click"].forEach(type => {
        target.dispatchEvent(new MouseEvent(type, {
          bubbles: true, cancelable: true
        }));
      });
      target.click?.();
      setStatus("5 Star clicked");
      return true;
    }

    // 4. AINS Rating button expander fallback: Click "Berikan penilaian anda" if stars not visible yet
    const ratingBtn = Array.from(document.querySelectorAll("button, span, div, p, ion-button, ion-item, ion-card"))
      .filter(el => !isInsidePanel(el) && isUsableElement(el))
      .find(el => {
        const text = (el.textContent || "").trim().toLowerCase();
        return text === "berikan penilaian anda" || text.includes("berikan penilaian anda");
      });
    if (ratingBtn) {
      const now = Date.now();
      if (now - lastRatingBtnClickTime > 2500) {
        lastRatingBtnClickTime = now;
        console.log("NILAM Assistant: Found rating expander, clicking...");
        clickLikeUser(ratingBtn);
      }
      setTimeout(forceClickFifthStar, 300);
      return true;
    }

    setStatus("5 Star not found");
    return false;
  }

  function clickButtonByText(text) {
    const btn = Array.from(document.querySelectorAll("button, span, div, p"))
      .filter(el => !isInsidePanel(el) && isUsableElement(el))
      .find((el) => (el.textContent || "").trim().includes(text));

    if (!btn) return false;
    btn.scrollIntoView({ behavior: "auto", block: "center" });
    setTimeout(() => btn.click(), 150);
    return true;
  }

  function scrollToBottomHard() {
    const doScroll = () => {
      window.scrollTo({
        top: document.documentElement.scrollHeight || document.body.scrollHeight,
        behavior: "auto"
      });
      document.documentElement.scrollTop = document.documentElement.scrollHeight;
      document.body.scrollTop = document.body.scrollHeight;

      const ionicContainers = document.querySelectorAll(
        "ion-content, .ion-content-scroll-host, .scroll-content, [class*='content-scroll'], main, [role='main']"
      );
      ionicContainers.forEach(el => {
        if (el.scrollToBottom) el.scrollToBottom(0);
        else el.scrollTop = el.scrollHeight;
      });

      const scrollers = Array.from(document.querySelectorAll("div, section, article"))
        .filter(el => {
          if (isInsidePanel(el)) return false;
          return el.scrollHeight > el.clientHeight + 50;
        });
      scrollers.forEach(el => {
        el.scrollTop = el.scrollHeight;
      });
    };

    setTimeout(doScroll, 100);
    setTimeout(doScroll, 400);
    setTimeout(doScroll, 800);
  }

  // Core Filling Orchestration
  let filledPage1 = false;
  let filledPage2 = false;

  async function fillVisibleForm() {
    const btnPasti = Array.from(document.querySelectorAll("button, span, div"))
      .filter(el => !isInsidePanel(el) && isUsableElement(el))
      .find((el) => (el.textContent || "").trim() === "Pasti");

    if (btnPasti) {
      btnPasti.click();
      const currentLang = state.filters.language;
      await advanceCloudState(currentLang);
      resetFillFlags();
      return true;
    }

    const currentLang = state.filters.language;
    const currentLangIndex = state.langCounters[currentLang] || 0;
    const book = await generateBook(currentLang, state.filters.category, currentLangIndex);

    if (document.getElementById("title")) {
      filledPage2 = false; // Self-healing state reset
      if (filledPage1) return false;
      filledPage1 = true;

      fillDate(book);
      setValue(document.getElementById("title"), book.title);
      setValue(document.getElementById("noOfPage"), book.pages);
      setValue(document.getElementById("isbn"), book.isbn);
      setValue(document.getElementById("author"), book.author);
      setValue(document.getElementById("publisher"), book.publisher);
      setValue(document.getElementById("publishedYear"), book.year);

      document.getElementById("typephysical")?.click();
      selectDropdownByText(0, book.category);
      selectDropdownByText(1, book.language);

      setStatus("Page 1 filled");
      setTimeout(() => clickButtonByText("Seterusnya"), 700);
      return true;
    }

    if (document.getElementById("summary")) {
      filledPage1 = false; // Self-healing state reset
      if (!filledPage2) {
        filledPage2 = true;
        setValue(document.getElementById("summary"), book.rumusan);
        setValue(document.getElementById("review"), book.lesson);
        setStatus("Page 2 filled");
        setTimeout(() => {
          forceClickFifthStar();
          scrollToBottomHard();
        }, 500);
      }
      forceClickFifthStar();
      return true;
    }

    // Page 3/4
    const buttons = Array.from(document.querySelectorAll("button, span, div, p")).filter(el => !isInsidePanel(el));
    const hasHantar = buttons.some((el) => {
      const t = (el.textContent || "").trim();
      return t === "Hantar" || t === "Simpan";
    });
    const hasSeterusnya = buttons.some((el) => {
      const t = (el.textContent || "").trim();
      return t === "Seterusnya";
    });

    if (hasHantar || hasSeterusnya) {
      scrollToBottomHard();
      return true;
    }

    return false;
  }

  function resetFillFlags() {
    filledPage1 = false;
    filledPage2 = false;
  }

  function setStatus(text) {
    const status = document.querySelector("#nilam-json-assistant-status");
    if (status) status.textContent = text;
  }

  // Update UI Panel fields
  async function renderBook() {
    const body = document.querySelector("#nilam-json-assistant-body");
    if (!body) return;

    const currentLang = state.filters.language;
    const currentLangIndex = state.langCounters[currentLang] || 0;
    const book = await generateBook(currentLang, state.filters.category, currentLangIndex);

    body.innerHTML = `
      <div class="nja-title">${escapeHtml(book.title)}</div>
      <div class="nja-meta">${escapeHtml(book.author)} · ${escapeHtml(book.publisher)} · ${book.year}</div>
      <div class="nja-date-label">📅 Tarikh: ${book.date}</div>
      <div class="nja-grid">
        <button class="nja-copy-btn" data-copy="title">Title</button>
        <button class="nja-copy-btn" data-copy="author">Author</button>
        <button class="nja-copy-btn" data-copy="publisher">Publisher</button>
        <button class="nja-copy-btn" data-copy="isbn">ISBN</button>
        <button class="nja-copy-btn" data-copy="rumusan">Rumusan</button>
        <button class="nja-copy-btn" data-copy="lesson">Lesson</button>
      </div>
      <textarea readonly>${escapeHtml(JSON.stringify(book, null, 2))}</textarea>
    `;
  }

  function updateUI() {
    const f = state.filters;
    const currentLang = f.language;
    const currentCount = state.currentBook || 0;
    const target = state.dailyTarget || 50;

    // Progress text
    const countBar = document.querySelector("#nja-count-bar");
    if (countBar) {
      countBar.innerHTML = `Session: <b>${state.currentSession || "None"}</b> | Index: <b>${state.currentBook}</b>`;
    }

    // Counters text
    const progressText = document.querySelector("#nja-progress-text");
    if (progressText) {
      const counters = state.langCounters || { bm: 0, en: 0, zh: 0 };
      progressText.innerHTML = `BM: <b>${counters.bm}</b> | EN: <b>${counters.en}</b> | ZH: <b>${counters.zh}</b>`;
    }

    // Progress Bar
    const pBar = document.querySelector("#nja-progress-fill");
    if (pBar) {
      const percent = Math.min(100, Math.floor((currentCount / target) * 100));
      pBar.style.width = `${percent}%`;
    }
    const pText = document.querySelector("#nja-progress-percentage");
    if (pText) {
      pText.textContent = `${currentCount}/${target} Books`;
    }

    const profileText = document.querySelector("#nja-profile-name");
    if (profileText) {
      profileText.textContent = state.profile.split("@")[0];
      profileText.title = state.profile;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  async function copyText(text) {
    await navigator.clipboard.writeText(String(text ?? ""));
    setStatus("Copied");
  }

  // Draggable Handler helper
  function makeDraggable(el, header) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    header.style.cursor = "move";
    header.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      if (e.target.closest("button") || e.target.closest("select") || e.target.closest("input")) return;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      const newTop = el.offsetTop - pos2;
      const newLeft = el.offsetLeft - pos1;
      
      el.style.top = newTop + "px";
      el.style.left = newLeft + "px";
      el.style.bottom = "auto";
      el.style.right = "auto";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
      localStorage.setItem("nilam_panel_top", el.style.top);
      localStorage.setItem("nilam_panel_left", el.style.left);
    }
  }

  function createPanel() {
    const panel = document.createElement("section");
    panel.id = "nilam-json-assistant";

    // Restore positions
    const savedTop = localStorage.getItem("nilam_panel_top");
    const savedLeft = localStorage.getItem("nilam_panel_left");
    const isCollapsed = localStorage.getItem("nilam_panel_collapsed") === "true";

    panel.style.cssText = `
      position: fixed;
      z-index: 999999;
      width: 260px;
      background: #ffffff;
      border: 2.5px solid #6846f5;
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(104, 70, 245, 0.2), 0 4px 12px rgba(0,0,0,0.08);
      font: 12px/1.4 system-ui, -apple-system, sans-serif;
      color: #2c3e50;
      padding: 0;
      box-sizing: border-box;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    if (savedTop && savedLeft) {
      panel.style.top = savedTop;
      panel.style.left = savedLeft;
    } else {
      panel.style.right = "16px";
      panel.style.bottom = "16px";
    }

    const shadowStyles = `
      .nja-header {
        background: #6846f5;
        color: #ffffff;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: bold;
        user-select: none;
      }
      .nja-header-title {
        font-size: 13px;
        letter-spacing: 0.5px;
      }
      .nja-header-toggle {
        background: transparent;
        border: none;
        color: #fff;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        padding: 0 4px;
      }
      .nja-body {
        padding: 12px;
        display: ${isCollapsed ? "none" : "block"};
      }
      .nja-profile-bar {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
        font-size: 11px;
        color: #7f8c8d;
      }
      #nja-count-bar {
        background: #f0edff;
        border-radius: 8px;
        padding: 5px 8px;
        font-size: 11px;
        color: #6846f5;
        margin-bottom: 6px;
        text-align: center;
      }
      #nja-progress-text {
        font-size: 11px;
        color: #34495e;
        text-align: center;
        margin-bottom: 8px;
      }
      .nja-progress-container {
        background: #ecf0f1;
        border-radius: 10px;
        height: 12px;
        position: relative;
        overflow: hidden;
        margin-bottom: 8px;
      }
      #nja-progress-fill {
        background: #22c55e;
        height: 100%;
        width: 0%;
        transition: width 0.3s ease;
      }
      #nja-progress-percentage {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        font-size: 9px;
        font-weight: bold;
        color: #2c3e50;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .nja-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin-bottom: 8px;
      }
      .nja-row-3 {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 4px;
        margin-bottom: 6px;
      }
      #nilam-json-assistant select {
        height: 28px;
        border: 1px solid #d0c8f5;
        border-radius: 8px;
        background: #f8f6ff;
        color: #333;
        padding: 0 4px;
        font-size: 11px;
      }
      #nilam-json-assistant input[type="date"] {
        height: 28px;
        border: 1px solid #d0c8f5;
        border-radius: 8px;
        background: #f8f6ff;
        padding: 0 4px;
        font-size: 11px;
      }
      .nja-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        min-height: 32px;
        border: none;
        border-radius: 8px;
        color: #fff;
        font-weight: 600;
        font-size: 11px;
        cursor: pointer;
        transition: opacity 0.15s, transform 0.1s;
      }
      .nja-btn:hover { opacity: 0.88; }
      .nja-btn:active { transform: scale(0.96); }
      .nja-btn-purple { background: #6846f5; }
      .nja-btn-green { background: #22c55e; }
      .nja-btn-blue { background: #3b82f6; }
      .nja-btn-amber { background: #f59e0b; }
      .nja-btn-red { background: #ef4444; }
      .nja-btn-gray { background: #7f8c8d; }
      .nja-copy-btn {
        min-height: 24px;
        border: 1px solid #d0c8f5;
        border-radius: 6px;
        background: #f8f6ff;
        color: #6846f5;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
      }
      .nja-copy-btn:hover { background: #ede9fe; }
      .nja-title {
        font-weight: 700;
        font-size: 12px;
        margin-bottom: 2px;
        color: #1a1a2e;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .nja-meta {
        color: #7f8c8d;
        font-size: 10px;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .nja-date-label {
        font-size: 10px;
        color: #6846f5;
        margin-bottom: 6px;
        font-weight: bold;
      }
      .nja-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 4px;
        margin: 6px 0;
      }
      #nilam-json-assistant textarea {
        width: 100%;
        height: 90px;
        resize: vertical;
        box-sizing: border-box;
        border: 1px solid #d0c8f5;
        border-radius: 8px;
        padding: 5px;
        font: 10px/1.3 Consolas, monospace;
        background: #fafafa;
      }
      #nilam-json-assistant-status {
        color: #6846f5;
        font-size: 11px;
        font-weight: bold;
        margin-top: 4px;
        text-align: center;
      }
    `;

    panel.innerHTML = `
      <style>${shadowStyles}</style>
      <div class="nja-header">
        <span class="nja-header-title">📚 NILAM Assistant</span>
        <button class="nja-header-toggle" id="nja-toggle-collapse">${isCollapsed ? "＋" : "－"}</button>
      </div>
      <div class="nja-body" id="nja-body-container">
        <div class="nja-profile-bar">
          <span>Profile: <b id="nja-profile-name">loading...</b></span>
          <span style="cursor: pointer; text-decoration: underline;" id="nja-change-target">Target: 50</span>
        </div>
        <div id="nja-count-bar">Syncing state...</div>
        <div id="nja-progress-text">BM: 0 | EN: 0 | ZH: 0</div>
        
        <div class="nja-progress-container">
          <div id="nja-progress-fill"></div>
          <div id="nja-progress-percentage">0/50 Books</div>
        </div>

        <div class="nja-row">
          <select id="nja-category">
            <option value="all">Category: All</option>
            <option value="Fiksyen">Fiksyen</option>
            <option value="Bukan Fiksyen">Bukan Fiksyen</option>
          </select>
          <select id="nja-language">
            <option value="bm">Language: BM</option>
            <option value="en">Language: EN</option>
            <option value="zh">Language: ZH</option>
          </select>
        </div>
        <div class="nja-row" style="grid-template-columns: 40px 1fr; align-items: center; gap: 4px;">
          <span style="font-size: 10px; color: #7f8c8d;">Date:</span>
          <input type="date" id="nja-start-date" />
        </div>
        
        <div class="nja-row">
          <button id="nja-fill" type="button" class="nja-btn nja-btn-purple">Auto Fill</button>
          <button id="nja-random" type="button" class="nja-btn nja-btn-blue">Random</button>
        </div>
        
        <div class="nja-row-3">
          <button id="nja-prev" type="button" class="nja-btn nja-btn-gray">Prev</button>
          <button id="nja-next" type="button" class="nja-btn nja-btn-green">Next</button>
          <button id="nja-star" type="button" class="nja-btn nja-btn-amber">5 Star</button>
        </div>
        <div class="nja-row-3">
          <button id="nja-scroll" type="button" class="nja-btn nja-btn-gray">Bottom</button>
          <button id="nja-calibrate-date" type="button" class="nja-btn nja-btn-purple" style="font-size: 9px; padding: 0 2px;">Calibrate Date</button>
          <button id="nja-calibrate-star" type="button" class="nja-btn nja-btn-amber" style="font-size: 9px; padding: 0 2px;">Calibrate Star</button>
        </div>
        <div class="nja-row">
          <button id="nja-reset" type="button" class="nja-btn nja-btn-red" style="font-size: 10px;">Reset Session</button>
          <button id="nja-sync" type="button" class="nja-btn nja-btn-blue" style="font-size: 10px;">Force Sync</button>
        </div>
        
        <div id="nilam-json-assistant-status">Connecting...</div>
        <div id="nilam-json-assistant-body"></div>
      </div>
    `;

    document.body.append(panel);

    // Initial setups
    document.querySelector("#nja-category").value = state.filters.category;
    document.querySelector("#nja-language").value = state.filters.language;
    document.querySelector("#nja-start-date").value = getBookDate();

    // Make Draggable
    makeDraggable(panel, panel.querySelector(".nja-header"));

    // Event Bindings
    panel.querySelector("#nja-toggle-collapse").addEventListener("click", () => {
      const body = panel.querySelector("#nja-body-container");
      const toggleBtn = panel.querySelector("#nja-toggle-collapse");
      const current = body.style.display === "none";
      body.style.display = current ? "block" : "none";
      toggleBtn.textContent = current ? "－" : "＋";
      localStorage.setItem("nilam_panel_collapsed", !current);
    });

    panel.addEventListener("change", async (event) => {
      const id = event.target.id;
      if (id === "nja-start-date") {
        localStorage.setItem("nilam_start_date", event.target.value);
        resetFillFlags();
        renderBook();
        updateUI();
        return;
      }
      if (id === "nja-category") state.filters.category = event.target.value;
      else if (id === "nja-language") state.filters.language = event.target.value;
      else return;

      resetFillFlags();
      saveState();
      renderBook();
      updateUI();
    });

    panel.querySelector("#nja-change-target").addEventListener("click", () => {
      const newTarget = prompt("Enter daily target books count:", state.dailyTarget);
      const parsed = parseInt(newTarget, 10);
      if (!isNaN(parsed) && parsed > 0) {
        state.dailyTarget = parsed;
        updateUI();
        // Post updated target count to Worker
        if (state.profile && state.profile !== "default") {
          fetch(`${WORKER_URL}/target`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile: state.profile, target: parsed })
          }).catch(console.error);
        }
      }
    });

    panel.addEventListener("click", async (event) => {
      const button = event.target.closest("button");
      if (!button || button.id === "nja-toggle-collapse") return;

      const currentLang = state.filters.language;

      if (button.id === "nja-prev") {
        if (state.langCounters[currentLang] > 0) {
          state.langCounters[currentLang] -= 1;
          if (state.currentBook > 0) state.currentBook -= 1;
          resetFillFlags();
        }
      }
      else if (button.id === "nja-next") {
        state.langCounters[currentLang] += 1;
        state.currentBook += 1;
        resetFillFlags();
      }
      else if (button.id === "nja-random") {
        const rand = Math.floor(Math.random() * 50);
        state.langCounters[currentLang] = rand;
        resetFillFlags();
      }
      else if (button.id === "nja-fill") {
        await fillVisibleForm();
      }
      else if (button.id === "nja-star") {
        forceClickFifthStar();
      }
      else if (button.id === "nja-scroll") {
        scrollToBottomHard();
      }
      else if (button.id === "nja-calibrate-date") {
        calibrateDate();
        return;
      }
      else if (button.id === "nja-calibrate-star") {
        calibrateStar();
        return;
      }
      else if (button.id === "nja-reset") {
        await resetSessionCloud();
        return;
      }
      else if (button.id === "nja-sync") {
        await fetchSessionState();
        return;
      }

      const copyField = button.dataset.copy;
      if (copyField) {
        const book = await generateBook(currentLang, state.filters.category, state.langCounters[currentLang] || 0);
        if (book) await copyText(book[copyField]);
        return;
      }

      renderBook();
      updateUI();
    });
  }

  async function main() {
    hookFetch();
    createPanel();
    
    // Attempt local state sync or default display
    saveState();
    await fetchSessionState();
    
    // Auto fill visible detection interval (runs every 800ms)
    setInterval(() => {
      fillVisibleForm();
    }, 800);
  }

  window.addEventListener("load", () => {
    main().catch((error) => {
      console.error("NILAM Assistant Error:", error);
      setStatus(`Err: ${error.message}`);
    });
  });
})();
