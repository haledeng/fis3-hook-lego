/**
 * test main file
 * @author jero
 * @date 2015-09-12
 */


var path = require('path');
var fis = require('fis3');
var _ = fis.util;
var expect = require('chai').expect;
var _release = fis.require('command-release/lib/release.js');
var _deploy = fis.require('command-release/lib/deploy.js');
var root = path.join(__dirname, 'src');
fis.project.setProjectRoot(root);
var _self = require('../index.js');

function release(opts, cb) {
    opts = opts || {};

    _release(opts, function(error, info) {
        _deploy(info, cb);
    });
}

function hookSelf(opts) {
    var key = 'modules.hook';
    var origin = fis.get(key);

    if (origin) {
        origin = typeof origin === 'string' ? origin.split(/\s*,\s*/) : (Array.isArray(origin) ? origin : [origin]);
    } else {
        origin = [];
    }

    origin.push(function (fis) {
        var options = {};
        _.assign(options, _self.defaultOptions);
        _.assign(options, opts);
        return _self.call(this, fis, options);
    });

    fis.set(key, origin);
}



describe('fis3-hook-lego ', function () {


    beforeEach(function () {
        var dev = path.join(__dirname, 'dev');
        _.del(dev);

        fis.match('*', {
            deploy: fis.plugin('local-deliver', {
                to: dev
            })
        });

        fis.hook('commonjs');

        hookSelf();


        fis.match(/^\/modules\/(.+)\.js$/, {
                isMod: true,
                id: '$1'
            })
            .match(/^\/modules\/((?:[^\/]+\/)*)([^\/]+)\/\2\.(js)$/i, {
                //isMod: true,
                id: '$1$2'
            })
            .match(/^\/lego_modules\/(.+)\.js$/i, {
                isMod: true,
                id: '$1'
            });

    });

    it('lego hook', function (done) {
        fis.on('release:end', function(ret) {
            var ids = ret.ids;
            var mainInfo = ids['pages/index/main.js'];
            var subpath = {   // subpath
                'dialog/0.1.0/custom': '/lego_modules/dialog/0.1.0/custom.js',
                'slider/0.1.0/index': '/lego_modules/slider/0.1.0/index.js',
                'tab/0.1.0/tab': '/lego_modules/tab/0.1.0/tab.js',
                'common': '/modules/common/common.js',      // 覆盖 modules/common.js
                'test_module': '/modules/test_module.js',    // 覆盖 lego 下的
                'index/header': '/modules/index/header/header.js',
                'index': '/modules/index/index.js', // 引用modules目录文件夹下的同名js文件
                'versions/0.1.0/index': '/lego_modules/versions/0.1.0/index.js' // 多版本
            };

            mainInfo.requires.forEach(function(id) {
                expect(ids[id].subpath).to.equal(subpath[id]);
            });
            
            var idMaps = fis.get('idMaps');
            expect(idMaps['dialog/0.1.0/custom']).to.equal('dialog');
            expect(idMaps['slider/0.1.0/index']).to.equal('slider');
            expect(idMaps['test_module']).to.equal('test_module');
             // expect(1).to.equal(2);
        });

        release({
            unique: true
        }, function() {
            done();
            console.log('release complete');
        });


        //expect(1).to.equal(1);
    });
});
