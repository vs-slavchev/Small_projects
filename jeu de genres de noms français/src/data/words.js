// Banque de mots brute : groupes (terminaisons) et mots.
// Chaque groupe compte au moins deux mots réguliers et au plus une exception
// (vérifié par tests/wordBank.test.js).
// Mot : w (texte), g ('m' | 'f'), grp (id du groupe ; absent ou null pour un mot sans règle, à apprendre par cœur), exc (exception),
//       asp (obligatoire pour un mot en h : true si h aspiré, false si h muet),
//       en (traduction), fun (anecdote facultative : un texte, ou un tableau de textes dont un est tiré au hasard à chaque réponse).
// Les mots commençant par une voyelle ou un h muet prennent l'article élidé « l’ » ; un mot en y- ne s'élide pas.
// Ce fichier ne contient que des données ; WordBank.fromData() les valide et les transforme en objets du domaine.

(function (LeOuLa) {
'use strict';

const GROUPS = Object.freeze([
  // Féminins
  { id: 'ette', label: '-ette', g: 'f', rule: "Les noms en <b>-ette</b> sont presque toujours féminins : c'est un suffixe diminutif féminin." },
  { id: 'tion', label: '-tion', g: 'f', rule: "Les noms en <b>-tion</b> sont féminins : ils viennent des noms latins en <i>-tio</i>." },
  { id: 'te', label: '-té', g: 'f', rule: "Les noms en <b>-té</b> (et <b>-tié</b>) qui désignent une qualité ou un état sont féminins." },
  { id: 'ure', label: '-ure', g: 'f', rule: "Les noms en <b>-ure</b> sont généralement féminins." },
  { id: 'ance', label: '-ance', g: 'f', rule: "Les noms en <b>-ance</b> sont féminins : le suffixe désigne une action ou un état." },
  { id: 'ence', label: '-ence', g: 'f', rule: "Les noms en <b>-ence</b> sont féminins, à une exception près, très courante." },
  { id: 'ade', label: '-ade', g: 'f', rule: "Les noms en <b>-ade</b> sont généralement féminins : le suffixe désigne une action ou son résultat." },
  { id: 'ee', label: '-ée', g: 'f', rule: "Les noms en <b>-ée</b> sont généralement féminins, comme un participe passé au féminin." },
  { id: 'ie', label: '-ie', g: 'f', rule: "Les noms en <b>-ie</b> sont presque tous féminins." },
  { id: 'elle', label: '-elle', g: 'f', rule: "Les noms en <b>-elle</b> sont féminins." },
  { id: 'esse', label: '-esse', g: 'f', rule: "Les noms en <b>-esse</b> sont féminins : le suffixe transforme un adjectif en nom de qualité." },
  { id: 'ise', label: '-ise', g: 'f', rule: "Les noms en <b>-ise</b> sont généralement féminins." },
  { id: 'oire', label: '-oire', g: 'f', rule: "Les noms en <b>-oire</b> sont généralement féminins." },
  { id: 'aille', label: '-aille', g: 'f', rule: "Les noms en <b>-aille</b> sont féminins : le suffixe désigne souvent une action ou un ensemble (la volaille, la ferraille)." },
  { id: 'eur', label: '-eur', g: 'f', rule: "Les noms en <b>-eur</b> qui désignent une sensation, une qualité ou une couleur sont féminins. Attention : les métiers et machines en <b>-teur</b> sont masculins." },
  { id: 'paysF', label: 'pays en -e', g: 'f', rule: "Les noms de pays qui finissent par <b>-e</b> sont féminins : la France, l’Italie." },
  // Masculins
  { id: 'age', label: '-age', g: 'm', rule: "Les noms en <b>-age</b> sont masculins quand <b>-age</b> est un suffixe ajouté à un verbe ou à un nom." },
  { id: 'ment', label: '-ment', g: 'm', rule: "Les noms en <b>-ment</b> sont masculins : le suffixe forme des noms d'action à partir de verbes." },
  { id: 'eau', label: '-eau', g: 'm', rule: "Les noms en <b>-eau</b> sont presque toujours masculins." },
  { id: 'isme', label: '-isme', g: 'm', rule: "Les noms en <b>-isme</b> sont toujours masculins." },
  { id: 'ier', label: '-ier', g: 'm', rule: "Les noms en <b>-ier</b> sont masculins : souvent un objet, un arbre ou un métier." },
  { id: 'et', label: '-et', g: 'm', rule: "Les noms en <b>-et</b> sont masculins : c'est le diminutif masculin, le pendant de <b>-ette</b>." },
  { id: 'on', label: '-on', g: 'm', rule: "Les noms en <b>-on</b> (hors <b>-tion</b>) sont généralement masculins." },
  { id: 'in', label: '-in', g: 'm', rule: "Les noms en <b>-in</b> sont généralement masculins." },
  { id: 'eme', label: '-ème', g: 'm', rule: "Les noms en <b>-ème</b> sont généralement masculins : beaucoup viennent de mots grecs neutres en <i>-ema</i>." },
  { id: 'at', label: '-at', g: 'm', rule: "Les noms en <b>-at</b> sont masculins." },
  { id: 'oir', label: '-oir', g: 'm', rule: "Les noms en <b>-oir</b> sont masculins : souvent un objet ou un lieu lié à une action." },
  { id: 'ail', label: '-ail', g: 'm', rule: "Les noms en <b>-ail</b> sont masculins." },
  { id: 'al', label: '-al', g: 'm', rule: "Les noms en <b>-al</b> sont masculins ; au pluriel, ils font souvent <b>-aux</b> : un cheval, des chevaux." },
  { id: 'ou', label: '-ou', g: 'm', rule: "Les noms en <b>-ou</b> sont masculins." },
  { id: 'cide', label: '-cide', g: 'm', rule: "Les noms en <b>-cide</b> sont masculins : le suffixe vient du latin <i>caedere</i>, « tuer »." },
  { id: 'phone', label: '-phone', g: 'm', rule: "Les noms en <b>-phone</b> sont masculins : le suffixe vient du grec <i>phônê</i>, « voix, son »." },
  { id: 'teur', label: '-teur', g: 'm', rule: "Les noms en <b>-teur</b> qui désignent une personne ou une machine sont masculins : le moteur, l’acteur." },
  { id: 'paysM', label: 'pays sans -e', g: 'm', rule: "Les noms de pays qui ne finissent pas par <b>-e</b> sont masculins : le Canada, le Japon." },
]);

const WORDS = Object.freeze([
  // -ette
  { w: 'baguette', g: 'f', grp: 'ette', en: 'baguette', fun: [
    "Le mot vient de l’italien <i>bacchetta</i>, « petit bâton ». Le pain a pris ce nom vers 1920.",
    "En 2022, l’UNESCO a inscrit le savoir-faire de la baguette au patrimoine culturel de l’humanité.",
  ] },
  { w: 'chaussette', g: 'f', grp: 'ette', en: 'sock', fun: "C’est une petite « chausse ». Au Moyen Âge, les chausses étaient de longs vêtements qui couvraient les jambes." },
  { w: 'squelette', g: 'm', grp: 'ette', exc: true, en: 'skeleton', fun: "Il vient du grec <i>skeletós</i>, « sec ». Ici, « -ette » ne veut pas dire « petit » : c’est un hasard d’orthographe." },
  { w: 'assiette', g: 'f', grp: 'ette', en: 'plate', fun: [
    "Avant, l’« assiette », c’était la façon d’être assis à table, puis le plat qu’on servait à cette place.",
    "On dit « Je ne suis pas dans mon assiette » : je ne me sens pas bien, je ne suis pas dans mon état normal.",
  ] },
  { w: 'fourchette', g: 'f', grp: 'ette', en: 'fork', fun: [
    "C’est une petite « fourche » pour la table.",
    "La fourchette est arrivée d’Italie au XVIᵉ siècle. Beaucoup de gens se moquaient d’elle : Louis XIV mangeait encore avec les doigts !",
  ] },
  { w: 'recette', g: 'f', grp: 'ette', en: 'recipe', fun: [
    "Du latin <i>recepta</i>, « choses reçues » : d’abord l’argent reçu, puis la façon de préparer un plat.",
    "Un des plus vieux livres de recettes en français est le <i>Viandier</i>, écrit par Taillevent, le cuisinier du roi Charles V.",
  ] },
  // -tion
  { w: 'réalisation', g: 'f', grp: 'tion', en: 'achievement, making', fun: [
    "De « réaliser », du latin <i>res</i>, « chose » : réaliser, c’est faire exister une chose.",
    "Au cinéma, la réalisation est le travail du réalisateur : c’est lui qui dirige le film.",
  ] },
  { w: 'nation', g: 'f', grp: 'tion', en: 'nation', fun: [
    "Du latin <i>nasci</i>, « naître » : au départ, un groupe de personnes nées au même endroit.",
    "En juin 1789, les députés du peuple ont pris le nom d’« Assemblée nationale » : le pouvoir vient maintenant de la nation, pas du roi.",
  ] },
  { w: 'potion', g: 'f', grp: 'tion', en: 'potion', fun: "Même origine que « poison » : les deux mots viennent du latin <i>potio</i>, « boisson ». Une potion peut soigner… ou tuer !" },
  { w: 'émotion', g: 'f', grp: 'tion', en: 'emotion', fun: "Du latin <i>emovere</i>, « mettre en mouvement » : une émotion, c’est ce qui nous fait bouger à l’intérieur." },
  { w: 'question', g: 'f', grp: 'tion', en: 'question', fun: [
    "Du latin <i>quaerere</i>, « chercher » : poser une question, c’est chercher une réponse.",
    "Avant la Révolution, la « question » était aussi la torture des accusés pour les faire parler. Louis XVI l’a abolie.",
  ] },
  { w: 'information', g: 'f', grp: 'tion', en: 'information', fun: "Du latin <i>informare</i>, « donner une forme » : informer quelqu’un, c’est donner une forme à ses idées." },
  // -té
  { w: 'amitié', g: 'f', grp: 'te', en: 'friendship', fun: [
    "Du latin <i>amicus</i>, « ami ». L’accord montre le féminin : « une amitié sincère ».",
    "Montaigne a écrit sur son ami La Boétie une phrase très célèbre : « Parce que c’était lui, parce que c’était moi. »",
  ] },
  { w: 'liberté', g: 'f', grp: 'te', en: 'freedom', fun: [
    "C’est le premier mot de la devise de la France : « Liberté, Égalité, Fraternité ».",
    "La statue de la Liberté, à New York, est un cadeau de la France aux États-Unis. Elle a été inaugurée en 1886.",
  ] },
  { w: 'beauté', g: 'f', grp: 'te', en: 'beauty', fun: [
    "« Beau » + <b>-té</b> donne « beauté », comme « bon » + <b>-té</b> donne « bonté ».",
    "Dans le conte <i>La Belle et la Bête</i> (1740), la Belle aime la Bête pour son cœur : la beauté du cœur est la plus forte.",
  ] },
  { w: 'côté', g: 'm', grp: 'te', exc: true, en: 'side', fun: [
    "Ce n’est pas une qualité : il vient du latin <i>costa</i>, « côte », comme les côtes du corps.",
    "La « gauche » et la « droite » en politique viennent de 1789 : les députés se sont assis d’un côté ou de l’autre de la salle selon leurs idées.",
  ] },
  { w: 'unité', g: 'f', grp: 'te', en: 'unit', fun: [
    "Du latin <i>unus</i>, « un ».",
    "Avant la Révolution, chaque région avait ses unités de mesure. La Révolution a créé le mètre et le kilo pour tout le monde.",
  ] },
  { w: 'santé', g: 'f', grp: 'te', en: 'health', fun: [
    "Du latin <i>sanus</i>, « sain ».",
    "On lève son verre et on dit « À votre santé ! » : on souhaite à l’autre une bonne santé et une longue vie.",
  ] },
  { w: 'vérité', g: 'f', grp: 'te', en: 'truth', fun: [
    "Du latin <i>verus</i>, « vrai ».",
    "Un proverbe dit : « La vérité sort de la bouche des enfants. » Les enfants disent ce qu’ils pensent.",
  ] },
  // -ure
  { w: 'voiture', g: 'f', grp: 'ure', en: 'car', fun: [
    "Du latin <i>vectura</i>, « transport ». Avant l’automobile, des chevaux tiraient les voitures.",
    "Dans les gares, on crie encore « En voiture ! » avant le départ du train : les wagons sont aussi des voitures.",
  ] },
  { w: 'culture', g: 'f', grp: 'ure', en: 'culture', fun: [
    "Au départ, la culture, c’est le travail de la terre : on cultive le blé, la vigne…",
    "Le Romain Cicéron parlait déjà de « cultiver son esprit » comme on cultive un champ. C’est le sens de « culture » aujourd’hui.",
  ] },
  { w: 'aventure', g: 'f', grp: 'ure', en: 'adventure', fun: "Du latin <i>adventura</i>, « ce qui va arriver ». « Dire la bonne aventure », c’est lire l’avenir dans la main." },
  { w: 'nature', g: 'f', grp: 'ure', en: 'nature', fun: "Du latin <i>nasci</i>, « naître » : la nature, c’est tout ce qui naît et grandit." },
  { w: 'chaussure', g: 'f', grp: 'ure', en: 'shoe', fun: "De « chausser », « mettre des souliers ». Le « cordonnier » qui répare les chaussures tire son nom du cuir de Cordoue, en Espagne." },
  // -ance
  { w: 'chance', g: 'f', grp: 'ance', en: 'luck', fun: "Du latin <i>cadentia</i>, « la façon dont tombent les dés ». La chance, c’est un bon jet de dés !" },
  { w: 'confiance', g: 'f', grp: 'ance', en: 'trust', fun: "De « confier » : avoir confiance, c’est pouvoir confier une chose précieuse à quelqu’un." },
  { w: 'ambulance', g: 'f', grp: 'ance', en: 'ambulance', fun: [
    "Au départ, c’est un « hôpital ambulant », un hôpital qui suivait l’armée.",
    "Pendant la Révolution, le médecin Dominique-Jean Larrey a créé des voitures rapides pour aller chercher les blessés pendant la bataille. Ensuite, il a suivi Napoléon dans ses guerres.",
  ] },
  { w: 'enfance', g: 'f', grp: 'ance', en: 'childhood', fun: "Du latin <i>infans</i>, « celui qui ne parle pas » : un enfant, c’est d’abord un bébé qui ne parle pas encore." },
  { w: 'naissance', g: 'f', grp: 'ance', en: 'birth', fun: [
    "Le nom du verbe « naître », comme « connaissance » pour « connaître ».",
    "La Renaissance (XVᵉ–XVIᵉ siècles), c’est une « nouvelle naissance » des arts : les artistes étudient de nouveau les Grecs et les Romains.",
  ] },
  // -ence
  { w: 'patience', g: 'f', grp: 'ence', en: 'patience', fun: [
    "Du latin <i>pati</i>, « souffrir » : c’est le même mot que le « patient » à l’hôpital.",
    "La Fontaine a écrit : « Patience et longueur de temps font plus que force ni que rage. » Un petit rat réussit là où un lion échoue.",
  ] },
  { w: 'science', g: 'f', grp: 'ence', en: 'science', fun: "Du latin <i>scire</i>, « savoir » : la science, c’est le savoir." },
  { w: 'silence', g: 'm', grp: 'ence', exc: true, en: 'silence', fun: "La seule exception vraiment courante du groupe. Pour la retenir : « Le silence est d’or. »" },
  { w: 'essence', g: 'f', grp: 'ence', en: 'petrol', fun: "Du latin <i>essentia</i>, « ce qui est au cœur d’une chose » : d’abord l’essence d’une fleur, son parfum, puis le carburant." },
  { w: 'différence', g: 'f', grp: 'ence', en: 'difference', fun: "Du latin <i>differre</i>, « porter d’un côté et de l’autre » : deux choses différentes vont dans deux directions." },
  { w: 'urgence', g: 'f', grp: 'ence', en: 'emergency', fun: "Du latin <i>urgere</i>, « presser, pousser ». À l’hôpital, on va « aux urgences »." },
  // -ade
  { w: 'salade', g: 'f', grp: 'ade', en: 'salad', fun: [
    "De l’italien <i>insalata</i>, « salée » : on mettait du sel sur les légumes.",
    "« Raconter des salades », c’est raconter des mensonges, un mélange d’histoires fausses.",
  ] },
  { w: 'promenade', g: 'f', grp: 'ade', en: 'walk', fun: [
    "Le nom du verbe « promener » ; <b>-ade</b> désigne une action, comme dans « baignade ».",
    "À Nice, la célèbre promenade des Anglais longe la mer. Vers 1820, des Anglais en vacances ont payé sa construction.",
  ] },
  { w: 'stade', g: 'm', grp: 'ade', exc: true, en: 'stadium', fun: "Du grec <i>stadion</i>, une mesure d’environ 190 m : la longueur de la piste d’Olympie, où sont nés les Jeux olympiques. Ici, « -ade » n’est pas un suffixe." },
  { w: 'ambassade', g: 'f', grp: 'ade', en: 'embassy', fun: "De l’italien <i>ambasciata</i>, « mission donnée à un envoyé ». L’ambassadeur parle au nom de son pays." },
  { w: 'limonade', g: 'f', grp: 'ade', en: 'lemonade', fun: "De « limon », un ancien nom du citron, qui vient de l’arabe <i>laymūn</i>. À Paris, au XVIIᵉ siècle, les « limonadiers » vendaient boissons et café." },
  { w: 'balade', g: 'f', grp: 'ade', en: 'stroll', fun: "De « se balader ». Le mot vient peut-être de « ballade », la chanson des musiciens qui allaient de ville en ville." },
  // -ée
  { w: 'soirée', g: 'f', grp: 'ee', en: 'evening, party', fun: "De « soir » : la soirée, c’est le soir vu comme une durée, puis la fête du soir. On souhaite « une bonne soirée »." },
  { w: 'journée', g: 'f', grp: 'ee', en: 'day', fun: "De « jour » : la journée insiste sur la durée, sur ce qu’on fait pendant le jour. « Bonne journée ! »" },
  { w: 'purée', g: 'f', grp: 'ee', en: 'mash', fun: [
    "Du vieux verbe « purer », « nettoyer, filtrer » : on écrasait les légumes pour les rendre lisses.",
    "Au XVIIIᵉ siècle, les Français n’aimaient pas la pomme de terre. Antoine Parmentier l’a rendue populaire : merci pour la purée !",
  ] },
  { w: 'musée', g: 'm', grp: 'ee', exc: true, en: 'museum', fun: [
    "Du grec <i>mouseion</i>, le temple des Muses, les déesses des arts. Le « -ée » vient du grec : ce n’est pas le suffixe féminin.",
    "Le Louvre était un palais des rois. En 1793, pendant la Révolution, il est devenu un musée ouvert à tous.",
  ] },
  { w: 'idée', g: 'f', grp: 'ee', en: 'idea', fun: [
    "Du grec <i>idea</i>, « forme, image ».",
    "Pour le philosophe grec Platon, les Idées sont les modèles parfaits des choses : nous voyons seulement leurs copies.",
  ] },
  { w: 'année', g: 'f', grp: 'ee', en: 'year', fun: "De « an » : comme « journée », « année » insiste sur la durée. Le 1ᵉʳ janvier, on souhaite « Bonne année ! »" },
  { w: 'entrée', g: 'f', grp: 'ee', en: 'entrance, starter', fun: "Le participe passé féminin du verbe « entrer », devenu un nom. Au restaurant, l’entrée est le premier plat du repas." },
  // -ie
  { w: 'sociologie', g: 'f', grp: 'ie', en: 'sociology', fun: "Mot créé par Auguste Comte au XIXᵉ siècle, du latin <i>socius</i>, « compagnon », et du grec <i>logos</i>, « étude » : l’étude de la vie en société." },
  { w: 'boulangerie', g: 'f', grp: 'ie', en: 'bakery', fun: "Le mot « boulanger » vient peut-être du picard <i>boulenc</i> : celui qui fait des pains ronds, en forme de boule." },
  { w: 'magie', g: 'f', grp: 'ie', en: 'magic', fun: [
    "Le mot vient des « mages », les prêtres savants de l’ancienne Perse.",
    "À Noël, les Rois mages apportent des cadeaux à l’enfant Jésus : ce sont aussi des mages.",
  ] },
  { w: 'parapluie', g: 'm', grp: 'ie', exc: true, en: 'umbrella', fun: "« Parer » (arrêter) + « pluie » : c’est l’objet qui arrête la pluie. Les mots faits d’un verbe et d’un nom sont masculins." },
  { w: 'harmonie', g: 'f', grp: 'ie', asp: false, en: 'harmony', fun: "Du grec <i>harmonia</i>, « assemblage » : les sons vont bien ensemble. Le h est muet : on dit « l’harmonie »." },
  { w: 'sortie', g: 'f', grp: 'ie', en: 'exit', fun: "Le participe passé féminin du verbe « sortir », devenu un nom." },
  { w: 'pharmacie', g: 'f', grp: 'ie', en: 'pharmacy', fun: "Du grec <i>pharmakon</i>, qui voulait dire à la fois « remède » et « poison » : tout dépend de la dose !" },
  // -elle
  { w: 'poubelle', g: 'f', grp: 'elle', en: 'bin', fun: "Elle porte le nom du préfet Eugène Poubelle. En 1884, il a obligé les Parisiens à mettre leurs déchets dans des boîtes." },
  { w: 'vaisselle', g: 'f', grp: 'elle', en: 'dishes', fun: [
    "Du latin <i>vascella</i>, « petits vases ».",
    "En 1689, Louis XIV n’avait plus d’argent pour la guerre : il a fait fondre sa vaisselle en argent pour faire des pièces de monnaie.",
  ] },
  { w: 'violoncelle', g: 'm', grp: 'elle', exc: true, en: 'cello', fun: "De l’italien <i>violoncello</i>, « petit violone ». En italien, le mot est masculin, et le français l’a gardé masculin." },
  { w: 'échelle', g: 'f', grp: 'elle', en: 'ladder', fun: "Du latin <i>scala</i>. Le « é » du début est venu pour aider la prononciation, comme dans « école » (latin <i>schola</i>)." },
  { w: 'nouvelle', g: 'f', grp: 'elle', en: 'news, short story', fun: [
    "L’adjectif « nouvelle » devenu nom : une nouvelle, c’est une chose nouvelle qu’on raconte.",
    "Une nouvelle, c’est aussi une histoire courte. Guy de Maupassant en a écrit plus de 300 !",
  ] },
  { w: 'ficelle', g: 'f', grp: 'elle', en: 'string', fun: [
    "Du latin populaire <i>filicella</i>, « petit fil ».",
    "« Tirer les ficelles », c’est diriger les autres en secret, comme on fait bouger une marionnette.",
  ] },
  // -esse
  { w: 'richesse', g: 'f', grp: 'esse', en: 'wealth', fun: "De « riche », qui vient d’un mot des Francs, <i>rîki</i>, « puissant » : la richesse, c’était d’abord la puissance, pas l’argent." },
  { w: 'jeunesse', g: 'f', grp: 'esse', en: 'youth', fun: [
    "Le suffixe <b>-esse</b> change un adjectif en nom : jeune → jeunesse, sage → sagesse.",
    "Un vieux proverbe dit : « Si jeunesse savait, si vieillesse pouvait. » Les jeunes ont la force, les vieux ont l’expérience.",
  ] },
  { w: 'politesse', g: 'f', grp: 'esse', en: 'politeness', fun: [
    "De l’italien <i>pulitezza</i>, « propreté » : être poli, c’était d’abord être lisse, comme une pierre polie.",
    "Le roi Louis XVIII disait : « L’exactitude est la politesse des rois. » Être à l’heure, c’est être poli.",
  ] },
  { w: 'adresse', g: 'f', grp: 'esse', en: 'address', fun: [
    "Du verbe « adresser », « envoyer vers » : l’adresse dit où envoyer une lettre.",
    "« Adresse » veut aussi dire « habileté » : au tir à l’arc, on montre son adresse. On parle de « jeux d’adresse ».",
  ] },
  { w: 'vitesse', g: 'f', grp: 'esse', en: 'speed', fun: "De l’ancien adjectif « viste », « rapide », qu’on retrouve dans « vite »." },
  { w: 'tristesse', g: 'f', grp: 'esse', en: 'sadness', fun: "« Triste » + <b>-esse</b>, comme « jeunesse » vient de « jeune »." },
  // -ise
  { w: 'valise', g: 'f', grp: 'ise', en: 'suitcase', fun: [
    "De l’italien <i>valigia</i>, arrivé en français au XVIᵉ siècle.",
    "Un « mot-valise » met deux mots dans un seul, comme une valise : « franglais » = « français » + « anglais ».",
  ] },
  { w: 'cerise', g: 'f', grp: 'ise', en: 'cherry', fun: [
    "Le fruit tire peut-être son nom de Cérasonte, une ville au bord de la mer Noire.",
    "<i>Le Temps des cerises</i> est une vieille chanson de 1866. Elle parle d’amour, et beaucoup de Français la connaissent encore.",
  ] },
  { w: 'pare-brise', g: 'm', grp: 'ise', exc: true, en: 'windscreen', fun: "Comme « parapluie », c’est un verbe + un nom : il « pare » (arrête) la « brise », le vent. Ces mots-là sont masculins." },
  { w: 'église', g: 'f', grp: 'ise', en: 'church', fun: "Du grec <i>ekklêsia</i>, « assemblée » : l’église, ce sont d’abord les gens réunis, puis le bâtiment." },
  { w: 'chemise', g: 'f', grp: 'ise', en: 'shirt', fun: [
    "Du latin <i>camisia</i>, comme l’espagnol <i>camisa</i>.",
    "En 1347, six bourgeois de Calais sont allés devant le roi d’Angleterre en chemise, une corde au cou, pour sauver leur ville. Rodin les a sculptés.",
  ] },
  { w: 'surprise', g: 'f', grp: 'ise', en: 'surprise', fun: "Le participe passé féminin du verbe « surprendre », devenu un nom." },
  // -oire
  { w: 'victoire', g: 'f', grp: 'oire', en: 'victory', fun: [
    "Du latin <i>victoria</i>. C’était aussi le nom de la déesse de la victoire chez les Romains.",
    "Au Louvre, la Victoire de Samothrace est une grande statue grecque avec des ailes, mais sans tête.",
  ] },
  { w: 'gloire', g: 'f', grp: 'oire', en: 'glory', fun: [
    "Du latin <i>gloria</i>, « renommée ».",
    "Dans l’hymne national, <i>La Marseillaise</i>, on chante : « Le jour de gloire est arrivé ! »",
  ] },
  { w: 'pourboire', g: 'm', grp: 'oire', exc: true, en: 'tip', fun: "Mot à mot « pour boire » : l’argent qu’on donne pour aller boire un verre. C’est un mot composé, donc masculin." },
  { w: 'histoire', g: 'f', grp: 'oire', asp: false, en: 'history, story', fun: [
    "Du grec <i>historia</i>, « enquête ». Le h est muet : on dit « l’histoire ».",
    "Le Grec Hérodote est appelé « le père de l’Histoire » : il a voyagé et posé des questions pour raconter le passé.",
  ] },
  { w: 'armoire', g: 'f', grp: 'oire', en: 'wardrobe', fun: "Du latin <i>armarium</i> : au départ, le meuble où l’on rangeait les armes, puis toutes sortes de choses." },
  { w: 'baignoire', g: 'f', grp: 'oire', en: 'bathtub', fun: [
    "De « baigner ». Comme dans « nageoire », <b>-oire</b> désigne un objet lié à une action.",
    "En 1793, le révolutionnaire Marat est tué dans sa baignoire. Le peintre David a fait un tableau très célèbre de cette scène.",
  ] },
  // -age
  { w: 'fromage', g: 'm', grp: 'age', en: 'cheese', fun: [
    "Du latin <i>formaticus</i>, « fait dans une forme » : on mettait le fromage dans un moule. L’italien dit <i>formaggio</i>.",
    "On dit que le général de Gaulle a demandé : « Comment gouverner un pays qui a 246 variétés de fromage ? »",
  ] },
  { w: 'voyage', g: 'm', grp: 'age', en: 'journey', fun: [
    "Du latin <i>viaticum</i>, la nourriture pour la route : le voyage, c’était d’abord ce qu’on emportait.",
    "Dans un roman de Jules Verne (1872), Phileas Fogg fait le tour du monde en quatre-vingts jours.",
  ] },
  { w: 'plage', g: 'f', grp: 'age', exc: true, en: 'beach', fun: [
    "Ici, « -age » n’est pas un suffixe : le mot vient du grec <i>plagios</i>, « oblique ». Même piège pour page, cage, image et nage.",
    "En mai 1968, les étudiants écrivent sur les murs de Paris : « Sous les pavés, la plage ! »",
  ] },
  { w: 'orage', g: 'm', grp: 'age', en: 'storm', fun: "De l’ancien mot « ore », « vent », qui vient du latin <i>aura</i>, « souffle »." },
  { w: 'message', g: 'm', grp: 'age', en: 'message', fun: "De l’ancien français « mes », « envoyé » : le message, c’est ce que porte l’envoyé." },
  { w: 'garage', g: 'm', grp: 'age', en: 'garage', fun: "De « garer » : le lieu où l’on met une voiture à l’abri." },
  // -ment
  { w: 'moment', g: 'm', grp: 'ment', en: 'moment', fun: "Du latin <i>momentum</i>, « mouvement » : au départ, le petit poids qui fait bouger une balance." },
  { w: 'monument', g: 'm', grp: 'ment', en: 'monument', fun: [
    "Du latin <i>monere</i>, « faire penser à » : un monument est là pour qu’on se souvienne.",
    "La tour Eiffel est construite pour l’Exposition universelle de 1889. Elle devait rester seulement vingt ans !",
  ] },
  { w: 'jument', g: 'f', grp: 'ment', exc: true, en: 'mare', fun: "C’est la femelle du cheval, donc le mot est féminin. En latin, <i>jumentum</i> voulait dire un animal qui porte des charges, mâle ou femelle." },
  { w: 'appartement', g: 'm', grp: 'ment', en: 'flat', fun: "De l’italien <i>appartamento</i>, la partie d’une grande maison gardée pour une personne." },
  { w: 'médicament', g: 'm', grp: 'ment', en: 'medicine', fun: "Du latin <i>mederi</i>, « soigner », comme « médecin »." },
  { w: 'vêtement', g: 'm', grp: 'ment', en: 'garment', fun: "De « vêtir », « habiller », du latin <i>vestire</i> : c’est la même famille que « veste »." },
  // -eau
  { w: 'bateau', g: 'm', grp: 'eau', en: 'boat', fun: [
    "Il vient peut-être du vieil anglais <i>bat</i> : l’anglais <i>boat</i> a la même origine.",
    "Sur le blason de Paris, il y a un bateau : la ville est née sur la Seine, grâce aux marchands qui voyageaient en bateau.",
  ] },
  { w: 'chapeau', g: 'm', grp: 'eau', en: 'hat', fun: [
    "De « chape », une grande cape avec une capuche : le chapeau était d’abord une petite chape.",
    "« Chapeau ! » veut dire « Bravo ! » : avant, on enlevait son chapeau pour montrer son respect.",
  ] },
  { w: 'peau', g: 'f', grp: 'eau', exc: true, en: 'skin', fun: [
    "Elle vient du latin <i>pellis</i>, un mot féminin, qu’on retrouve dans « pellicule ».",
    "Dans <i>La Peau de chagrin</i> de Balzac (1831), une peau magique donne tout ce qu’on veut, mais elle devient plus petite à chaque souhait.",
  ] },
  { w: 'oiseau', g: 'm', grp: 'eau', en: 'bird', fun: "Du latin populaire <i>aucellus</i>, « petit oiseau »." },
  { w: 'gâteau', g: 'm', grp: 'eau', en: 'cake', fun: [
    "D’un mot des Francs, <i>wastil</i>, « nourriture ».",
    "« C’est du gâteau ! » veut dire « C’est très facile ! »",
  ] },
  { w: 'couteau', g: 'm', grp: 'eau', en: 'knife', fun: "Du latin <i>cultellus</i>, « petit couteau ». « Être à couteaux tirés », c’est être fâché avec quelqu’un." },
  // -isme
  { w: 'enthousiasme', g: 'm', grp: 'isme', en: 'enthusiasm', fun: "Du grec <i>enthousiasmos</i> : être enthousiaste, c’était avoir un dieu en soi. Masculin, comme en grec : « un grand enthousiasme »." },
  { w: 'mécanisme', g: 'm', grp: 'isme', en: 'mechanism', fun: "Du grec <i>mêkhanê</i>, « machine » : un mécanisme, ce sont des pièces qui travaillent ensemble, comme dans une montre." },
  { w: 'tourisme', g: 'm', grp: 'isme', en: 'tourism', fun: [
    "De l’anglais <i>tourism</i> : au XVIIIᵉ siècle, les jeunes Anglais riches faisaient le « Grand Tour » de l’Europe.",
    "En 1838, l’écrivain Stendhal publie <i>Mémoires d’un touriste</i> : le mot « touriste » devient populaire en France.",
  ] },
  { w: 'réalisme', g: 'm', grp: 'isme', en: 'realism', fun: "Le mot devient célèbre au XIXᵉ siècle avec le peintre Gustave Courbet : il peint les gens simples, comme ils sont vraiment." },
  { w: 'optimisme', g: 'm', grp: 'isme', en: 'optimism', fun: [
    "Du latin <i>optimus</i>, « le meilleur ».",
    "Dans <i>Candide</i> (1759), Voltaire se moque de l’optimisme : tout va mal, mais le professeur Pangloss répète que tout va bien.",
  ] },
  { w: 'cyclisme', g: 'm', grp: 'isme', en: 'cycling', fun: "De « cycle », un ancien nom du vélo, du grec <i>kuklos</i>, « cercle » : comme la roue." },
  // -ier
  { w: 'cahier', g: 'm', grp: 'ier', en: 'notebook', fun: [
    "Du latin <i>quaterni</i>, « par quatre » : un cahier, c’était des feuilles pliées en quatre.",
    "En 1789, avant la Révolution, les Français ont écrit leurs problèmes et leurs demandes au roi dans des cahiers.",
  ] },
  { w: 'panier', g: 'm', grp: 'ier', en: 'basket', fun: "Du latin <i>panarium</i>, « corbeille à pain » : on retrouve « pain » dans « panier »." },
  { w: 'escalier', g: 'm', grp: 'ier', en: 'staircase', fun: [
    "Du latin <i>scala</i>, « échelle ».",
    "Diderot parle de « l’esprit de l’escalier » : on trouve la bonne réponse trop tard, dans l’escalier, après la discussion.",
  ] },
  { w: 'papier', g: 'm', grp: 'ier', en: 'paper', fun: "Du latin <i>papyrus</i>, la plante d’Égypte qui servait à faire les premières feuilles." },
  { w: 'quartier', g: 'm', grp: 'ier', en: 'neighbourhood', fun: [
    "Au départ, un quart d’une chose ; puis une partie d’une ville.",
    "À Paris, le Quartier latin s’appelle comme ça parce que les étudiants de la Sorbonne y parlaient latin.",
  ] },
  // -et
  { w: 'projet', g: 'm', grp: 'et', en: 'project', fun: "Du verbe « projeter », « jeter en avant » : un projet, c’est une idée lancée vers l’avenir." },
  { w: 'jouet', g: 'm', grp: 'et', en: 'toy', fun: "De « jouer », du latin <i>jocari</i>, « plaisanter ». L’anglais <i>joke</i> vient de la même famille." },
  { w: 'billet', g: 'm', grp: 'et', en: 'ticket', fun: [
    "De l’ancien mot « bullette », un petit papier fermé avec de la cire.",
    "Les premiers billets de banque en France arrivent en 1716, avec l’Écossais John Law. Avant, on payait avec des pièces.",
  ] },
  { w: 'objet', g: 'm', grp: 'et', en: 'object', fun: "Du latin <i>objectum</i>, « ce qui est placé devant » : un objet, c’est ce qu’on a devant les yeux." },
  { w: 'poulet', g: 'm', grp: 'et', en: 'chicken', fun: [
    "C’est le petit de la poule.",
    "On dit que le roi Henri IV voulait voir chaque paysan manger « la poule au pot » le dimanche.",
  ] },
  { w: 'secret', g: 'm', grp: 'et', en: 'secret', fun: [
    "Du latin <i>secretum</i>, « ce qui est mis à part ».",
    "Un « secret de Polichinelle », c’est un secret que tout le monde connaît. Polichinelle est une marionnette qui parle trop.",
  ] },
  // -on
  { w: 'citron', g: 'm', grp: 'on', en: 'lemon', fun: "Du latin <i>citrus</i>. Ce fruit vient d’Asie ; il est arrivé autour de la Méditerranée il y a environ deux mille ans." },
  { w: 'bouton', g: 'm', grp: 'on', en: 'button', fun: "De « bouter », « pousser » : d’abord la petite boule qui pousse sur une plante, puis le petit objet rond qui lui ressemble." },
  { w: 'maison', g: 'f', grp: 'on', exc: true, en: 'house', fun: "Du latin <i>mansio</i>, « lieu où l’on reste », un mot féminin. C’est la même famille que « manoir »." },
  { w: 'hérisson', g: 'm', grp: 'on', asp: true, en: 'hedgehog', fun: "Du latin <i>ericius</i>. Le h est aspiré : on dit « le hérisson », sans élision." },
  { w: 'horizon', g: 'm', grp: 'on', asp: false, en: 'horizon', fun: "Du grec <i>horizôn</i>, « qui fait la limite » : la ligne entre le ciel et la terre. Le h est muet : on dit « l’horizon »." },
  { w: 'ballon', g: 'm', grp: 'on', en: 'ball', fun: [
    "De l’italien <i>pallone</i>, « grosse balle ».",
    "En 1783, les frères Montgolfier font voler le premier grand ballon à air chaud. On l’appelle une « montgolfière ».",
  ] },
  { w: 'salon', g: 'm', grp: 'on', en: 'living room', fun: [
    "De l’italien <i>salone</i>, « grande salle ».",
    "Au Louvre, les grandes expositions de peinture avaient lieu dans le « Salon carré ». Depuis, on parle du « Salon » de peinture, ou du salon de l’auto.",
  ] },
  // -in
  { w: 'jardin', g: 'm', grp: 'in', en: 'garden', fun: [
    "D’un mot des Francs, <i>gart</i>, « clôture » : un jardin était d’abord un terrain fermé.",
    "Les jardins de Versailles sont l’œuvre d’André Le Nôtre. On parle de « jardin à la française » : des formes très régulières.",
  ] },
  { w: 'matin', g: 'm', grp: 'in', en: 'morning', fun: "Du latin <i>matutinum</i>. Matuta était la déesse romaine du lever du soleil." },
  { w: 'main', g: 'f', grp: 'in', exc: true, en: 'hand', fun: "Du latin <i>manus</i>, déjà féminin. On le retrouve dans « manuel », « manier » et « manucure »." },
  { w: 'chemin', g: 'm', grp: 'in', en: 'path', fun: [
    "D’un mot gaulois, <i>camminos</i>. L’espagnol <i>camino</i> a la même racine.",
    "Le proverbe dit : « Tous les chemins mènent à Rome. » Il y a plusieurs façons d’arriver au même but.",
  ] },
  { w: 'lapin', g: 'm', grp: 'in', en: 'rabbit', fun: [
    "Le mot apparaît au XVᵉ siècle. Masculin ; la femelle, c’est « la lapine ».",
    "« Poser un lapin » à quelqu’un, c’est ne pas venir au rendez-vous.",
  ] },
  { w: 'vin', g: 'm', grp: 'in', en: 'wine', fun: "Du latin <i>vinum</i>. Ce sont les Grecs puis les Romains qui ont apporté la vigne en Gaule." },
  // -ème
  { w: 'problème', g: 'm', grp: 'eme', en: 'problem', fun: "Du grec <i>problêma</i>, « ce qu’on jette devant soi » : un obstacle sur la route." },
  { w: 'système', g: 'm', grp: 'eme', en: 'system', fun: "Du grec <i>systêma</i>, « assemblage ». Comme thème et poème, ce mot grec en <i>-ema</i> est masculin." },
  { w: 'crème', g: 'f', grp: 'eme', exc: true, en: 'cream', fun: "Rien de grec ici : le mot vient peut-être du gaulois <i>crama</i>. « La crème de la crème », c’est le meilleur du meilleur." },
  { w: 'thème', g: 'm', grp: 'eme', en: 'theme', fun: "Du grec <i>thema</i>, « ce qu’on pose » : le sujet qu’on pose au départ." },
  { w: 'poème', g: 'm', grp: 'eme', en: 'poem', fun: "Du grec <i>poiêma</i>, « ce qu’on fabrique », de <i>poiein</i>, « faire » : le poète fabrique avec les mots." },
  // -at
  { w: 'chocolat', g: 'm', grp: 'at', en: 'chocolate', fun: [
    "Du nahuatl <i>xocolatl</i>, une boisson amère des Aztèques, au Mexique.",
    "On dit que le chocolat est arrivé à la cour de France en 1615, avec Anne d’Autriche, la femme de Louis XIII.",
  ] },
  { w: 'résultat', g: 'm', grp: 'at', en: 'result', fun: "Du latin <i>resultare</i>, « rebondir » : le résultat, c’est ce qui rebondit après une action." },
  { w: 'avocat', g: 'm', grp: 'at', en: 'lawyer', fun: [
    "Du latin <i>advocatus</i>, « celui qu’on appelle à l’aide ».",
    "« Avocat » est aussi le nom d’un fruit ! Ce mot-là vient de la langue des Aztèques, <i>ahuacatl</i>. Les deux sont masculins.",
  ] },
  { w: 'chat', g: 'm', grp: 'at', en: 'cat', fun: [
    "Du latin <i>cattus</i>. Le chat est sans doute arrivé en Gaule avec les Romains.",
    "Dans le conte de Charles Perrault (1697), le Chat botté aide son pauvre maître à devenir riche.",
  ] },
  { w: 'climat', g: 'm', grp: 'at', en: 'climate', fun: "Du grec <i>klima</i>, « inclinaison » : celle du soleil, qui change selon la région du monde." },
  // -oir
  { w: 'miroir', g: 'm', grp: 'oir', en: 'mirror', fun: [
    "De « mirer », « regarder », du latin <i>mirari</i>, « s’étonner », comme dans « miracle ».",
    "À Versailles, la galerie des Glaces a 357 miroirs. Louis XIV a fait venir des artisans de Venise pour les fabriquer en France.",
  ] },
  { w: 'couloir', g: 'm', grp: 'oir', en: 'corridor', fun: "De « couler » : un passage étroit où l’on « coule » d’une pièce à l’autre, comme l’eau." },
  { w: 'espoir', g: 'm', grp: 'oir', en: 'hope', fun: "Le nom du verbe « espérer ». Le proverbe dit : « Tant qu’il y a de la vie, il y a de l’espoir. »" },
  { w: 'soir', g: 'm', grp: 'oir', en: 'evening', fun: "Du latin <i>sero</i>, « tard »." },
  { w: 'devoir', g: 'm', grp: 'oir', en: 'homework, duty', fun: "Le verbe « devoir » employé comme nom : ce qu’on doit faire. À l’école, on fait ses devoirs." },
  // -ail
  { w: 'travail', g: 'm', grp: 'ail', en: 'work', fun: "Il vient peut-être du latin <i>tripalium</i>, un instrument à trois pieux. Pour beaucoup, le travail était une souffrance !" },
  { w: 'portail', g: 'm', grp: 'ail', en: 'gate', fun: "De « porte » : une grande porte, souvent celle d’une église ou d’un jardin." },
  { w: 'ail', g: 'm', grp: 'ail', en: 'garlic', fun: [
    "Du latin <i>allium</i>. L’accord montre le masculin : « l’ail est fort ».",
    "On dit qu’à la naissance du roi Henri IV, son grand-père lui a frotté les lèvres avec de l’ail pour le rendre fort.",
  ] },
  { w: 'détail', g: 'm', grp: 'ail', en: 'detail', fun: "De « détailler », « couper en morceaux » : on vend « au détail », en petites quantités." },
  // -aille
  { w: 'taille', g: 'f', grp: 'aille', en: 'size, waist', fun: [
    "Du verbe « tailler », « couper » : d’abord la coupe d’une pierre ou d’un habit, puis la mesure du corps.",
    "Avant 1789, la taille était aussi un impôt : l’argent que les paysans payaient au roi. Les nobles ne la payaient pas.",
  ] },
  { w: 'bataille', g: 'f', grp: 'aille', en: 'battle', fun: [
    "Du latin <i>battualia</i>, « exercices de combat », de <i>battuere</i>, « battre ».",
    "La « bataille » est aussi un jeu de cartes pour les enfants : la carte la plus forte gagne.",
  ] },
  { w: 'médaille', g: 'f', grp: 'aille', en: 'medal', fun: [
    "De l’italien <i>medaglia</i>, d’abord une petite pièce de monnaie. « La médaille d’or ».",
    "« Le revers de la médaille », c’est le côté négatif d’une bonne chose.",
  ] },
  { w: 'paille', g: 'f', grp: 'aille', en: 'straw', fun: "Du latin <i>palea</i>, déjà féminin. Pour choisir au hasard, on « tire à la courte paille »." },
  { w: 'volaille', g: 'f', grp: 'aille', en: 'poultry', fun: "Du latin <i>volatilia</i>, « les oiseaux », de <i>volare</i>, « voler ». La volaille, ce sont les oiseaux de la ferme." },
  { w: 'écaille', g: 'f', grp: 'aille', en: 'scale (fish)', fun: "D’un mot germanique, <i>skalja</i>, « coquille ». L’accord montre le féminin : « une écaille brillante »." },
  // -eur
  { w: 'fleur', g: 'f', grp: 'eur', en: 'flower', fun: [
    "Du latin <i>flos</i>, qui était masculin ! Le mot est devenu féminin en français.",
    "La fleur de lys est le symbole des rois de France. On la voit encore sur le drapeau du Québec.",
  ] },
  { w: 'peur', g: 'f', grp: 'eur', en: 'fear', fun: "Du latin <i>pavor</i>, masculin en latin mais féminin en français. Une très grande peur, c’est « une peur bleue »." },
  { w: 'couleur', g: 'f', grp: 'eur', en: 'colour', fun: "Du latin <i>color</i>, masculin en latin et en italien (<i>il colore</i>), mais féminin en français : « ma couleur préférée »." },
  { w: 'chaleur', g: 'f', grp: 'eur', en: 'heat', fun: "Du latin <i>calor</i>, qu’on retrouve dans « calorie ». Masculin en latin, féminin en français : « une forte chaleur »." },
  { w: 'odeur', g: 'f', grp: 'eur', en: 'smell', fun: [
    "Du latin <i>odor</i>, qu’on retrouve dans « odorat ». L’accord montre le féminin : « une bonne odeur ».",
    "Grasse, dans le sud de la France, est la ville du parfum : on y cultive des fleurs pour leur odeur depuis des siècles.",
  ] },
  { w: 'erreur', g: 'f', grp: 'eur', en: 'mistake', fun: "Du latin <i>error</i>, « action d’errer » : se tromper, c’est se perdre en chemin. « Une grosse erreur »." },
  { w: 'bonheur', g: 'm', grp: 'eur', exc: true, en: 'happiness', fun: "Mot à mot « bon heur » : « heur » était un ancien mot pour « chance ». Le bonheur, c’est une bonne chance, et il garde le masculin de « heur »." },
  // -al
  { w: 'cheval', g: 'm', grp: 'al', en: 'horse', fun: [
    "Du latin populaire <i>caballus</i>, « cheval de travail ». Un cheval, des chevaux.",
    "Dans l’histoire de Troie, les Grecs se cachent dans un grand cheval en bois pour entrer dans la ville.",
  ] },
  { w: 'journal', g: 'm', grp: 'al', en: 'newspaper', fun: [
    "Du latin <i>diurnalis</i>, « de chaque jour » : un journal paraît chaque jour.",
    "Le premier journal quotidien en France, le <i>Journal de Paris</i>, est né en 1777.",
  ] },
  { w: 'animal', g: 'm', grp: 'al', en: 'animal', fun: "Du latin <i>anima</i>, « souffle » : l’animal, c’est l’être qui respire. Un animal, des animaux." },
  { w: 'hôpital', g: 'm', grp: 'al', asp: false, en: 'hospital', fun: [
    "Du latin <i>hospitale</i>, « maison pour les hôtes ». Le h est muet : on dit « l’hôpital ».",
    "L’Hôtel-Dieu de Paris, près de Notre-Dame, est un des plus vieux hôpitaux du monde : il existe depuis le VIIᵉ siècle.",
  ] },
  { w: 'canal', g: 'm', grp: 'al', en: 'canal', fun: [
    "Du latin <i>canalis</i>, « tuyau ». Un canal, des canaux.",
    "Le canal du Midi, construit au XVIIᵉ siècle, permet d’aller en bateau de l’Atlantique à la Méditerranée, avec la Garonne.",
  ] },
  // -ou
  { w: 'bijou', g: 'm', grp: 'ou', en: 'jewel', fun: "Du breton <i>bizou</i>, « anneau », de <i>biz</i>, « doigt » : le premier bijou était une bague. Des bijoux, avec un x." },
  { w: 'genou', g: 'm', grp: 'ou', en: 'knee', fun: "Du latin populaire <i>genuculum</i>, « petit genou ». Des genoux, avec un x." },
  { w: 'chou', g: 'm', grp: 'ou', en: 'cabbage', fun: "Du latin <i>caulis</i>, « tige ». « Mon petit chou » est un mot d’amour ; et un chou à la crème est un gâteau !" },
  { w: 'caillou', g: 'm', grp: 'ou', en: 'pebble', fun: [
    "Il vient sans doute d’un mot gaulois, <i>caljo-</i>, « pierre ». Des cailloux, avec un x.",
    "Dans le conte de Perrault, le Petit Poucet laisse tomber des petits cailloux blancs pour retrouver le chemin de la maison.",
  ] },
  { w: 'hibou', g: 'm', grp: 'ou', asp: true, en: 'owl', fun: "Le mot imite peut-être son cri. Le h est aspiré : on dit « le hibou », sans élision, et des hiboux avec un x." },
  { w: 'trou', g: 'm', grp: 'ou', en: 'hole', fun: "Du latin populaire <i>traucum</i>, sans doute d’origine gauloise. Quelqu’un qui oublie tout a « un trou de mémoire »." },
  // -cide
  { w: 'insecticide', g: 'm', grp: 'cide', en: 'insecticide', fun: "« Insecte » + le latin <i>caedere</i>, « tuer » : le produit qui tue les insectes." },
  { w: 'herbicide', g: 'm', grp: 'cide', asp: false, en: 'weedkiller', fun: "« Herbe » + le latin <i>caedere</i>, « tuer » : le produit qui tue les mauvaises herbes. Le h est muet : « l’herbicide »." },
  { w: 'pesticide', g: 'm', grp: 'cide', en: 'pesticide', fun: "Vient de l’anglais <i>pesticide</i> : <i>pest</i>, « animal ou plante nuisible », + le latin <i>caedere</i>, « tuer »." },
  // -phone
  { w: 'téléphone', g: 'm', grp: 'phone', en: 'telephone', fun: "Du grec <i>têle</i>, « loin », et <i>phônê</i>, « voix » : la voix qui vient de loin. On donne « un coup de téléphone »." },
  { w: 'microphone', g: 'm', grp: 'phone', en: 'microphone', fun: "Du grec <i>mikros</i>, « petit », et <i>phônê</i>, « son » : il capte les petits sons. On dit souvent « le micro »." },
  { w: 'saxophone', g: 'm', grp: 'phone', en: 'saxophone', fun: "Le Belge Adolphe Sax a inventé cet instrument vers 1840 et lui a donné son nom. On dit souvent « le saxo »." },
  { w: 'interphone', g: 'm', grp: 'phone', en: 'intercom', fun: "Du latin <i>inter</i>, « entre », et du grec <i>phônê</i>, « voix » : on se parle entre la porte de l’immeuble et l’appartement." },
  { w: 'smartphone', g: 'm', grp: 'phone', en: 'smartphone', fun: "Vient de l’anglais, au début des années 2000 : mot à mot « téléphone intelligent ». Au Québec, on dit « un téléphone intelligent »." },
  // -teur
  { w: 'moteur', g: 'm', grp: 'teur', en: 'engine', fun: [
    "Du latin <i>motor</i>, « celui qui fait bouger ». On dit « le moteur d’une voiture ».",
    "Au cinéma, avant de filmer, on crie « Moteur ! » : la caméra commence à tourner.",
  ] },
  { w: 'ordinateur', g: 'm', grp: 'teur', en: 'computer', fun: "Le professeur de latin Jacques Perret a proposé ce mot en 1955, à la demande d’une entreprise d’informatique : une machine qui met de l’ordre. « Un ordinateur portable »." },
  { w: 'acteur', g: 'm', grp: 'teur', en: 'actor', fun: [
    "Du latin <i>actor</i>, « celui qui agit ». Au féminin, on dit « une actrice ».",
    "En 1673, Molière tombe malade sur scène pendant qu’il joue <i>Le Malade imaginaire</i>. Il meurt quelques heures plus tard.",
  ] },
  { w: 'facteur', g: 'm', grp: 'teur', en: 'postman', fun: [
    "Du latin <i>factor</i>, « celui qui fait ». Au féminin, on dit « la factrice ».",
    "Le facteur Cheval a ramassé des pierres pendant ses tournées pendant 33 ans. Avec elles, il a construit seul un palais : le Palais idéal.",
  ] },
  { w: 'aspirateur', g: 'm', grp: 'teur', en: 'vacuum cleaner', fun: "Du verbe « aspirer », « tirer l’air vers soi ». On « passe l’aspirateur » pour nettoyer le sol." },
  { w: 'hauteur', g: 'f', grp: 'teur', exc: true, asp: true, en: 'height', fun: "De l’adjectif « haut » : c’est une mesure, une qualité, d’où le féminin : « la hauteur d’un mur ». Le h est aspiré : on ne dit jamais « l’hauteur »." },
  // pays en -e
  { w: 'France', g: 'f', grp: 'paysF', en: 'France', fun: "Du latin <i>Francia</i>, « le pays des Francs », un peuple germanique installé en Gaule. Leur roi Clovis est souvent appelé le premier roi des Francs." },
  { w: 'Italie', g: 'f', grp: 'paysF', en: 'Italy', fun: "Du latin <i>Italia</i>. Au départ, ce nom désignait seulement le sud du pays actuel. L’accord montre le féminin : « l’Italie est belle »." },
  { w: 'Espagne', g: 'f', grp: 'paysF', en: 'Spain', fun: "Du latin <i>Hispania</i>, le nom romain de l’Espagne et du Portugal ensemble. L’accord montre le féminin : « l’Espagne entière »." },
  { w: 'Belgique', g: 'f', grp: 'paysF', en: 'Belgium', fun: [
    "Du nom des <i>Belgae</i>, un peuple gaulois.",
    "Jules César a écrit : « De tous les Gaulois, les Belges sont les plus courageux. »",
  ] },
  { w: 'Chine', g: 'f', grp: 'paysF', en: 'China', fun: [
    "Le nom vient peut-être de Qin, la famille d’empereurs qui a uni le pays en 221 avant J.-C.",
    "En anglais, <i>china</i> veut aussi dire « porcelaine » : pendant des siècles, la plus belle porcelaine venait de Chine.",
  ] },
  { w: 'Mexique', g: 'm', grp: 'paysF', exc: true, en: 'Mexico', fun: "Du nom des Mexicas, le peuple aztèque qui a fondé la ville de Mexico. Masculin malgré son -e final : « le Mexique », « au Mexique »." },
  // pays sans -e
  { w: 'Canada', g: 'm', grp: 'paysM', en: 'Canada', fun: [
    "Il vient sans doute du mot iroquoien <i>kanata</i>, « village ». « Le Canada », « au Canada ».",
    "En 1535, l’explorateur français Jacques Cartier entend le mot <i>kanata</i> et pense que c’est le nom du pays.",
  ] },
  { w: 'Japon', g: 'm', grp: 'paysM', en: 'Japan', fun: "Du chinois <i>Riben</i>, « origine du soleil » : c’est le pays du Soleil-Levant. « Le Japon », « au Japon »." },
  { w: 'Portugal', g: 'm', grp: 'paysM', en: 'Portugal', fun: "Du latin <i>Portus Cale</i>, un port romain : c’est aujourd’hui la ville de Porto. La ville a donné son nom au pays. « Le Portugal », « au Portugal »." },
  { w: 'Brésil', g: 'm', grp: 'paysM', en: 'Brazil', fun: "Il porte le nom du « bois de braise » (<i>pau-brasil</i>), un arbre au bois rouge comme le feu, envoyé en Europe. « Le Brésil », « au Brésil »." },
  { w: 'Danemark', g: 'm', grp: 'paysM', en: 'Denmark', fun: "Mot à mot la « marche des Danois » : une « marche » était une région à la frontière. « Le Danemark », « au Danemark »." },
  { w: 'Iran', g: 'm', grp: 'paysM', en: 'Iran', fun: [
    "Du persan ancien : « le pays des Aryens ». L’accord montre le masculin : « l’Iran est grand ».",
    "Pendant longtemps, en Europe, on a appelé ce pays la « Perse ». Il demande à s’appeler « Iran » en 1935.",
  ] },
  // Sans règle : ni groupe, ni exception, le genre s'apprend par cœur
  { w: 'mer', g: 'f', en: 'sea', fun: "Du latin <i>mare</i>, devenu féminin en français. Attention : « la mer » et « la mère » se prononcent de la même façon !" },
  { w: 'nuit', g: 'f', en: 'night', fun: [
    "Du latin <i>nox, noctis</i>, déjà féminin. On souhaite « bonne nuit ».",
    "« Passer une nuit blanche », c’est ne pas dormir de la nuit.",
  ] },
  { w: 'dent', g: 'f', en: 'tooth', fun: "Du latin <i>dens</i>, qui était masculin ! Le mot est devenu féminin en français : « une dent de lait »." },
  { w: 'voix', g: 'f', en: 'voice', fun: "Du latin <i>vox</i>, déjà féminin, qu’on retrouve dans « vocal ». On parle « à voix basse »." },
  { w: 'souris', g: 'f', en: 'mouse', fun: "Du latin <i>sorex</i>. En France, c’est « la petite souris » qui apporte une pièce quand un enfant perd une dent." },
  { w: 'clé', g: 'f', en: 'key', fun: "Du latin <i>clavis</i>, déjà féminin. On écrit aussi « clef ». Une chose très importante est « la clé du problème »." },
  { w: 'radio', g: 'f', en: 'radio', fun: [
    "C’est le mot court pour « radiodiffusion », un mot féminin : « la radio ».",
    "Le 18 juin 1940, depuis Londres, le général de Gaulle parle aux Français à la radio et leur demande de continuer le combat.",
  ] },
  { w: 'photo', g: 'f', en: 'photo', fun: [
    "C’est le mot court pour « photographie », du grec <i>phôs</i>, « lumière », et <i>graphein</i>, « écrire » : écrire avec la lumière.",
    "Vers 1827, le Français Nicéphore Niépce fait la première photographie de l’histoire, depuis sa fenêtre. Il a fallu des heures de pose !",
  ] },
  { w: 'vélo', g: 'm', en: 'bike', fun: [
    "C’est le mot court pour « vélocipède », du latin <i>velox</i>, « rapide », et <i>pes</i>, « pied ».",
    "L’ancêtre du vélo, la draisienne (1817), n’avait pas de pédales : on avançait en poussant avec les pieds.",
  ] },
  { w: 'lit', g: 'm', en: 'bed', fun: [
    "Du latin <i>lectus</i>, déjà masculin. On va « au lit ».",
    "À Versailles, beaucoup de personnes regardaient le roi se lever le matin : c’était « le lever du roi ».",
  ] },
  { w: 'nez', g: 'm', en: 'nose', fun: [
    "Du latin <i>nasus</i>, déjà masculin. Le z ne se prononce pas : « le bout du nez ».",
    "Dans la pièce <i>Cyrano de Bergerac</i> (1897), Cyrano a un très grand nez. Il fait des blagues sur lui-même avec beaucoup d’esprit.",
  ] },
  { w: 'pied', g: 'm', en: 'foot', fun: [
    "Du latin <i>pes, pedis</i>, qu’on retrouve dans « piéton » et « pédale ». On va « à pied ».",
    "Avant le mètre, le « pied » était aussi une mesure de longueur, environ 32 cm en France.",
  ] },
  { w: 'sel', g: 'm', en: 'salt', fun: "Du latin <i>sal</i>, qui a donné « salaire » : on dit que les soldats romains recevaient de l’argent pour acheter du sel." },
  { w: 'livre', g: 'm', en: 'book', fun: "Du latin <i>liber</i> : c’était la peau intérieure des arbres, et on écrivait dessus. Attention : « le livre » se lit, « la livre » (500 g) se pèse." },
  { w: 'dos', g: 'm', en: 'back', fun: "Du latin <i>dorsum</i>, devenu masculin en français. Le s ne se prononce pas : « le dos », « un sac à dos »." },
  { w: 'lait', g: 'm', en: 'milk', fun: [
    "Du latin <i>lac, lactis</i>, qu’on retrouve dans « lactose ». « Un verre de lait ».",
    "Notre galaxie s’appelle la Voie lactée : pour les Anciens, c’était une route de lait dans le ciel.",
  ] },
  { w: 'école', g: 'f', en: 'school', fun: [
    "Du grec <i>skholê</i>, « temps libre » : le temps qu’on avait pour étudier. L’accord montre le féminin : « une grande école ».",
    "En 1881 et 1882, avec Jules Ferry, l’école devient gratuite et obligatoire en France pour tous les enfants.",
  ] },
  { w: 'arbre', g: 'm', en: 'tree', fun: "Du latin <i>arbor</i>, qui était féminin ! Le mot est devenu masculin en français. L’accord le montre : « un grand arbre »." },
]);

const WORD_DATA = Object.freeze({ groups: GROUPS, words: WORDS });

Object.assign(LeOuLa, { GROUPS, WORDS, WORD_DATA });
})(globalThis.LeOuLa ??= {});
