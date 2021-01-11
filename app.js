const BASE_URL = 'https://api.harvardartmuseums.org';
const KEY = 'apikey=998e07fd-18be-4c97-b25d-f270c0de7ffd'; 

async function fetchUrl(subject, extra = ''){
    onFetchStart()
    const url =  `${ BASE_URL }/${subject}?${ KEY }${extra}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(data);
        return data;
    } catch (error) {
        console.error();
    } finally {
      onFetchEnd();
    }
}

async function fetchObjects() {
  return await fetchUrl('object');
}


async function fetchAllCenturies() {
    if (localStorage.getItem('centuries')) {
        return JSON.parse(localStorage.getItem('centuries'));
    }
    const centuries = await fetchUrl('century','&size=100&sort=temporalorder');
    localStorage.setItem('centuries', JSON.stringify(centuries.records));
    return centuries.records;
}

async function fetchAllClassifications() {
    if (localStorage.getItem('classification')) {
        return JSON.parse(localStorage.getItem('classification'));
    }
    const classifications = await fetchUrl('classification','&size=100&sort=name');
    localStorage.setItem('classification',JSON.stringify(classifications.records));
    return classifications.records;
}

async function prefetchCategoryLists() {
    try {
      const [
        classifications, centuries
      ] = await Promise.all([
        fetchAllClassifications(),
        fetchAllCenturies()
      ]);
      
    $('.classification-count').text(`(${ classifications.length })`);
    classifications.forEach(classification => {
        $('#select-classification').append(
            `<option value="${classification.name}">${classification.name}</option>`
        );
    });

    $('.century-count').text(`(${ centuries.length }))`);
    centuries.forEach(century => {
        $('#select-century').append(
            `<option value="${century.name}">${century.name}</option>`
        )
    });

    } catch (error) {
      console.error(error);
    }
}

function buildSearchString () {
  const classificationVal = $('#select-classification').val();
  const centuryVal = $('#select-century').val();
  const keywordVal = $('#keywords').val();
  return encodeURI(`&classification=${classificationVal}&century=${centuryVal}&keyword=${keywordVal}`);
}

$('#search').on('submit', async function (event) {
  event.preventDefault();
    try {
      const end = buildSearchString();
      const result = await fetchUrl('object', end);
      updatePreview(result.records,result.info);
      // console.log(result.info);
      console.log(result);
    } catch (error) {
      console.error(error);
    }
});

function onFetchStart() {
  $('#loading').addClass('active');
}

function onFetchEnd() {
  $('#loading').removeClass('active');
}

function renderPreview(record) {
// grab description, primaryimageurl, and title from the record
const {
  description,
  primaryimageurl,
  title,
} = record;

return $(`<div class="object-preview">
  <a href="#">
  ${primaryimageurl && title ? `<img src="${ primaryimageurl }" />`: title ? `<h3>${ title }<h3>`: description ? `<h3>${ description }<h3>`: `<img src="${ primaryimageurl }" />`}
  </a>
</div>`).data('record', record);

}

function updatePreview(records,info) {
  
  const root = $('#preview');
  const results = $('.results');
  if (info.next) {
    root.find('.next')
      .data('url', info.next)
      .attr('disabled', false)
  } else {
    root.find('.next')
      .data('url', null)
      .attr('disabled', true)
  }
  if (info.prev) {
    root.find('.previous')
      .data('url', info.prev)
      .attr('disabled', false)
  } else {
    root.find('.previous')
      .data('url', null)
      .attr('disabled', true)
  }
  results.empty();
  records.forEach(record => results.append(renderPreview(record)));
}

$('#preview .next, #preview .previous').on('click', async function () {
  try {
    let url = $(this).data('url');
    url = url.replace(`${BASE_URL}/object?${KEY}`,'');
    const results = await fetchUrl('object',url);
    updatePreview(results.records,results.info);
  } catch (error) {
    console.error(error)
  }
});

$('#preview').on('click', '.object-preview', function (event) {
  event.preventDefault(); 
  const record = $(this).data('record');
  const feature = $('#feature');
  feature.html(renderFeature(record));
});

$('#feature').on('click', 'a', async function (event) {
  event.preventDefault();
  let href = $(this).attr('href');
  if (href.startsWith('mailto:')) {
    return;
  }
  try {
    href = href.replace(`${BASE_URL}/object?${KEY}`,'');
    const results = await fetchUrl('object',href);
    updatePreview(results.records,results.info);
  } catch (error) {
    console.error(error)
  }
});

function photosHTML(images, primaryimageurl) {
  if (images.length > 0) {
    return images.map(image => `<img src="${ image.baseimageurl }" />`).join('');
  } else if (primaryimageurl) {
    return `<img src="${ primaryimageurl }" />`;
  } else {
    return '';
  }
}

function factHTML(title, content, searchTerm = null) {
  if (!content) {
    return ''
  }

  return `
    <span class="title">${ title }</span>
    <span class="content">
      ${ searchTerm && content ? `<a href="${ BASE_URL }/object?${ KEY }&${ searchTerm }=${ encodeURI(content.split('-').join('|')) }">${content}</a>`: content }
    </span>
  `
}

function renderFeature(record) {
  const { 
    title, 
    dated,
    images,
    primaryimageurl,
    description,
    culture,
    style,
    technique,
    medium,
    dimensions,
    people,
    department,
    division,
    contact,
    creditline,
  } = record;
  return $(`<div class="object-feature">
  <header>
    <h3>${ title }<h3>
    <h4>${ dated }</h4>
  </header>
  <section class="facts">
    ${ factHTML('Description', description) }
    ${ factHTML('Culture', culture, 'culture') }
    ${ factHTML('Style', style) }
    ${ factHTML('Technique', technique, 'technique' )}
    ${ factHTML('Medium', medium ? medium.toLowerCase() : null, 'medium') }
    ${ factHTML('Dimensions', dimensions) }
    ${ 
      people 
      ? people.map(
          person => factHTML('Person', person.displayname, 'person')
        ).join('')
      : ''
    }
    ${ factHTML('Department', department) }
    ${ factHTML('Division', division) }
    ${ factHTML('Contact', `<a target="_blank" href="mailto:${ contact }">${ contact }</a>`) }
    ${ factHTML('Credit', creditline) }
  </section>
  <section class="photos">
    ${ photosHTML(images, primaryimageurl) }
  </section>
</div>`);
}


function bootstrap(){
    fetchObjects();
    prefetchCategoryLists();
}

bootstrap();