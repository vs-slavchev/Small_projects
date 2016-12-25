import scrapy


class BrickSetSpider(scrapy.Spider):
    name = "brickset_spider"
    start_urls = ['http://brickset.com/sets/year-2014',
                  'http://brickset.com/sets/year-2015',
                  'http://brickset.com/sets/year-2016']

    def parse(self, response):
        SET_SELECTOR = '.set'
        for brickset in response.css(SET_SELECTOR):
            # ::text fetches the text inside the 'a' tag instead of the tag itself
            NAME_SELECTOR = 'h1 a ::text'
            # inside a dl tag find a dt with the text equal to Pieces, and for its corresponding dd get the text of 'a'
            PIECES_SELECTOR = './/dl[dt/text() = "Pieces"]/dd/a/text()'
            MINIFIGS_SELECTOR = './/dl[dt/text() = "Minifigs"]/dd[2]/a/text()'
            RETAIL_PRICE_SELECTOR = './/dl[dt/text() = "RRP"]/dd/text()'
            # select the src attribute of the img tag
            IMAGE_SELECTOR = 'img ::attr(src)'
            yield {
                # extract_first() gives us the first occurrence, so a string instead of a list
                'name': brickset.css(NAME_SELECTOR).extract_first(),
                'pieces': brickset.xpath(PIECES_SELECTOR).extract_first(),
                'minifigs': brickset.xpath(MINIFIGS_SELECTOR).extract_first(),
                'price': brickset.xpath(RETAIL_PRICE_SELECTOR).extract_first(),
                'image': brickset.css(IMAGE_SELECTOR).extract_first(),
            }

        # go to next page by looking for the .next class and in its 'a' tag reading the href attribute
        NEXT_PAGE_SELECTOR = '.next a ::attr(href)'
        next_page = response.css(NEXT_PAGE_SELECTOR).extract_first()
        # check if it exists
        if next_page:
            # make a request to perform a crawl
            yield scrapy.Request(
                response.urljoin(next_page),
                # in the end call the parse again on the next page
                callback=self.parse
            )